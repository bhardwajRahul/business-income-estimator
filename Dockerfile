# base
FROM node:18-alpine3.19 as base

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Install dependencies
RUN npm ci

# Copy the rest of your app's source code
COPY . .

# Install shadcn@latest CLI globally
RUN echo y | npm install shadcn@latest -g

# Install shadcn-ui/ui components
RUN yes | npx shadcn@latest add input && \
    yes | npx shadcn@latest add label && \
    yes | npx shadcn@latest add checkbox && \
    yes | npx shadcn@latest add button && \
    yes | npx shadcn@latest add card && \
    yes | npx shadcn@latest add select && \
    yes | npx shadcn@latest add tabs && \
    yes | npx shadcn@latest add separator && \
    yes | npx shadcn@latest add scroll-area && \
    yes | npx shadcn@latest add sheet && \
    yes | npx shadcn@latest add dialog && \
    yes | npx shadcn@latest add table

# Install additional required packages
RUN npm install lucide-react framer-motion axios

# Set up Tailwind CSS
RUN yes | npx tailwindcss init -p

# for lint

FROM base as linter

# Set the working directory
WORKDIR /app

RUN npm run lint

# for build

FROM linter as builder

WORKDIR /app

# Build your Next.js app
RUN npm run build

# for production

FROM node:18-alpine3.19

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --only=production

COPY --from=builder /app ./

# Expose the port Next.js runs on
EXPOSE 3000

# Start the app
CMD ["npm", "start"]