FROM maven:3.8-openjdk-17 AS build
WORKDIR /app
COPY medverse-backend/pom.xml .
COPY medverse-backend/src ./src
RUN mvn clean install -DskipTests

FROM openjdk:17-slim
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]