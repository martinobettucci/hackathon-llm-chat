# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG BASE_PATH=/chat/
ENV BASE_PATH=$BASE_PATH
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app /app
EXPOSE 8088
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "8086"]
