# syntax=docker/dockerfile:1.4
FROM docker.io/library/maven:3.9.9-eclipse-temurin-17-noble AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src src
RUN mvn -q -B -DskipTests package \
    && JAR=$(ls target/server-*.jar | head -1) \
    && cp "$JAR" /app/app.jar

FROM docker.io/library/eclipse-temurin:17-jre-jammy
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --no-create-home --shell /usr/sbin/nologin app \
    && mkdir -p /app/files \
    && chown -R app:app /app
WORKDIR /app
COPY --from=build --chown=app:app /app/app.jar app.jar
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8080/actuator/health >/dev/null || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
