# Build stage
FROM node:20-alpine AS build
WORKDIR /chat
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /chat
COPY --from=build /chat /chat
EXPOSE 8088
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "8086"]
