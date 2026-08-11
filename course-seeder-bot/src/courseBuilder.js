import { generateCourseSkeleton, generateModuleContent } from './contentGenerator.js'
import { randomInt } from './random.js'

export async function buildRandomCourses(http, config) {
  const courseCount = randomInt(config.volume.coursesMin, config.volume.coursesMax)
  console.log(`\n[courses] Gerando ${courseCount} curso(s)...`)

  const courses = []
  for (let index = 0; index < courseCount; index++) {
    courses.push(await buildOneCourse(http, config, index + 1, courseCount))
  }
  return courses
}

async function buildOneCourse(http, config, index, total) {
  const modulesCount = randomInt(config.volume.modulesMin, config.volume.modulesMax)
  const lessonsPerModule = randomInt(config.volume.lessonsMin, config.volume.lessonsMax)

  console.log(`\n[curso ${index}/${total}] gerando curriculo (${modulesCount} modulos x ${lessonsPerModule} aulas)...`)
  const skeleton = await generateCourseSkeleton(config, { modulesCount, lessonsPerModule })
  console.log(`[curso ${index}/${total}] "${skeleton.name}"`)

  const course = await http.post('/courses', {
    name: skeleton.name,
    description: skeleton.description,
    landingDescription: skeleton.landingDescription,
    visibility: 'public',
    categories: skeleton.categories,
  })

  // Every new course is seeded with one default module/lesson/block (see backend CourseService);
  // it exists so a human editing by hand has somewhere to start, but the bot builds its own.
  await removeSeededModules(http, course.id)

  for (const moduleSkeleton of skeleton.modules) {
    await buildModule(http, config, course, moduleSkeleton)
  }

  if (config.publishCourses) {
    await http.patch(`/courses/${course.id}`, { status: 'available' })
  }

  console.log(`[curso ${index}/${total}] pronto -> /courses/${course.owner.nickname}/${course.slug}`)
  return course
}

async function removeSeededModules(http, courseId) {
  const modules = await http.get(`/courses/${courseId}/modules`)
  for (const module of modules) {
    await http.delete(`/modules/${module.id}`)
  }
}

async function buildModule(http, config, course, moduleSkeleton) {
  const module = await http.post(`/courses/${course.id}/modules`, { title: moduleSkeleton.title })
  console.log(`  [modulo] "${moduleSkeleton.title}"`)

  const lessons = await generateModuleContent(config, {
    courseName: course.name,
    moduleTitle: moduleSkeleton.title,
    lessonTitles: moduleSkeleton.lessonTitles,
    blocksMin: config.volume.blocksMin,
    blocksMax: config.volume.blocksMax,
  })

  for (const lesson of lessons) {
    await buildLesson(http, module.id, lesson)
  }
}

async function buildLesson(http, moduleId, lessonContent) {
  const lesson = await http.post(`/modules/${moduleId}/lessons`, { title: lessonContent.title })

  for (const block of lessonContent.blocks) {
    await http.post(`/lessons/${lesson.id}/blocks`, {
      type: block.type,
      content: block.content,
      language: block.language,
    })
  }

  console.log(`    [aula] "${lessonContent.title}" (${lessonContent.blocks.length} blocos)`)
}
