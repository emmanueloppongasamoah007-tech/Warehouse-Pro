# Multi-stage build: compile with Maven, ship only a JRE + the jar.
#
# Tests are skipped deliberately, not for speed. The default Spring profile is
# `supabase`, so booting the test context would demand DB_PASSWORD and a
# reachable database during the image build - neither exists at build time.
# Run `mvn test` locally (or in CI) against the H2 fallback profile instead.
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build

# Copy the POM alone first so dependency resolution lands in its own layer.
# Later edits under src/ then reuse the cached downloads instead of re-fetching
# every dependency on each build.
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app

# Run as a non-root user. Nothing here needs root, and a container that does
# not run as root limits what a compromise of the app can reach.
RUN useradd --create-home --shell /usr/sbin/nologin spring
COPY --from=build --chown=spring:spring /build/target/warehouse-0.0.1-SNAPSHOT.jar app.jar
USER spring

# Documentation only - the real port comes from the PORT env var that Render
# injects, which application.properties reads as ${PORT:8080}.
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
