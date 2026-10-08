package com.coursemaker;

import com.coursemaker.service.ResendMailSender;
import com.coursemaker.support.Fixtures.TestUser;
import com.coursemaker.support.IntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.then;

/**
 * Race conditions: many requests fired at the same instant. Each scenario checks an invariant that
 * a "read, decide, then write" implementation breaks under parallelism.
 */
@DisplayName("Concorrencia: rajadas de requisicoes simultaneas")
class ConcurrencyIT extends IntegrationTest {

    private static final Pattern TOKEN_PATTERN = Pattern.compile("token=([\\w-]+)");

    @MockitoBean
    private ResendMailSender mailSender;

    /** Runs every call on its own thread, released together by a latch; returns the HTTP statuses. */
    private List<Integer> fireAtOnce(int count, Callable<Integer> request) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(count);
        CountDownLatch ready = new CountDownLatch(count);
        CountDownLatch go = new CountDownLatch(1);
        try {
            List<Future<Integer>> futures = new ArrayList<>();
            for (int i = 0; i < count; i++) {
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    go.await();
                    return request.call();
                }));
            }
            ready.await();
            go.countDown();
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> future : futures) {
                statuses.add(future.get());
            }
            return statuses;
        } finally {
            pool.shutdownNow();
        }
    }

    private int postStatus(String path, Object body) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.post(path)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(body)))
                .andReturn().getResponse().getStatus();
    }

    private int postStatusAs(Caller caller, String path, Object body) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.post(path)
                        .header("Authorization", "Bearer " + caller.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(body)))
                .andReturn().getResponse().getStatus();
    }

    private long count(List<Integer> statuses, int status) {
        return statuses.stream().filter(s -> s == status).count();
    }

    @Test
    @DisplayName("40 logins errados simultaneos: so 5 sao avaliados, o resto leva 429")
    void parallelWrongLoginsCannotOutrunTheLimit() throws Exception {
        TestUser user = fixtures.user("ana");

        List<Integer> statuses = fireAtOnce(40, () -> postStatus("/api/v1/auth/login",
                Map.of("identifier", user.email(), "password", "errada")));

        // Exactly the configured 5 attempts reach the password check; nothing slips through.
        assertThat(count(statuses, 401)).isEqualTo(5);
        assertThat(count(statuses, 429)).isEqualTo(35);
    }

    @Test
    @DisplayName("10 cadastros simultaneos do mesmo email: so 1 conta, nenhum erro 500")
    void parallelSignUpsCreateOneAccount() throws Exception {
        List<Integer> statuses = fireAtOnce(10, () -> postStatus("/api/v1/auth/register",
                Map.of("email", "corrida@example.com", "password", "senha-super-secreta", "name", "Corrida")));

        assertThat(count(statuses, 201)).isEqualTo(1);
        assertThat(count(statuses, 409)).isEqualTo(9);
        Integer accounts = jdbc.queryForObject(
                "SELECT count(*) FROM users WHERE email = 'corrida@example.com'", Integer.class);
        assertThat(accounts).isEqualTo(1);
    }

    @Test
    @DisplayName("o mesmo link de redefinicao confirmado 10x em paralelo: so um vence")
    void aResetLinkWorksOnlyOnceEvenInParallel() throws Exception {
        TestUser user = fixtures.user("ana");
        post("/api/v1/auth/password-reset/request", Map.of("email", user.email()), Caller.ANONYMOUS);
        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        then(mailSender).should().send(eq(user.email()), anyString(), html.capture());
        Matcher matcher = TOKEN_PATTERN.matcher(html.getValue());
        assertThat(matcher.find()).isTrue();
        String token = matcher.group(1);

        List<Integer> statuses = fireAtOnce(10, () -> postStatus("/api/v1/auth/password-reset/confirm",
                Map.of("token", token, "newPassword", "nova-senha-123")));

        assertThat(count(statuses, 200)).isEqualTo(1);
        assertThat(count(statuses, 400) + count(statuses, 429)).isEqualTo(9);
    }

    @Test
    @DisplayName("30 senhas erradas simultaneas de post privado: so 5 avaliadas, sem travar o pool")
    void parallelPrivatePostGuessesCannotOutrunTheLimit() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser reader = fixtures.user("bruno");
        java.util.UUID postId = fixtures.privatePost(owner, "Post Fechado", "abre-te-sesamo");

        long started = System.currentTimeMillis();
        List<Integer> statuses = fireAtOnce(30, () -> postStatusAs(reader.caller(),
                "/api/v1/posts/private-access/validate", Map.of("postId", postId, "password", "chute")));

        assertThat(count(statuses, 401)).isEqualTo(5);
        assertThat(count(statuses, 429)).isEqualTo(25);
        // A starved connection pool would sit on the 30 s Hikari timeout instead.
        assertThat(System.currentTimeMillis() - started).isLessThan(20_000);
    }

    @Test
    @DisplayName("30 senhas erradas simultaneas de curso privado (matricula): so 5 avaliadas")
    void parallelPrivateCourseGuessesCannotOutrunTheLimit() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        java.util.UUID courseId = fixtures.privateCourse(owner, "Curso Fechado", "abre-te-sesamo");

        long started = System.currentTimeMillis();
        List<Integer> statuses = fireAtOnce(30, () -> postStatusAs(student.caller(), "/api/v1/enrollments",
                Map.of("courseId", courseId, "password", "chute")));

        assertThat(count(statuses, 401)).isEqualTo(5);
        assertThat(count(statuses, 429)).isEqualTo(25);
        assertThat(System.currentTimeMillis() - started).isLessThan(20_000);
    }
}
