FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod .
COPY main.go .
RUN go build -o gateway .

FROM alpine:3.19
COPY --from=build /app/gateway /gateway
EXPOSE 8081
ENTRYPOINT ["/gateway"]
