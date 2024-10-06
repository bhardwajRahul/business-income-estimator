# Use the official Node.js 18 image as a parent image
FROM node:18-alpine

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

# Ensure the styles directory exists and create globals.css if it doesn't exist
# RUN mkdir -p src/styles && \
#     touch src/styles/globals.css && \
#     echo "@tailwind base;\n@tailwind components;\n@tailwind utilities;" > src/styles/globals.css

# Build your Next.js app
RUN npm run build

# Expose the port Next.js runs on
EXPOSE 3000

# Start the app
CMD ["npm", "start"]