# Stage 1: Build the React app
FROM node:20-alpine AS build

# Set working directory
WORKDIR /

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React app
RUN npm run build

EXPOSE 8007
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8007"]
#RUN npm run dev -- --host 0.0.0.0 --port 8007
