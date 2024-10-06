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

# Install shadcn-ui@latest CLI globally
RUN npm install shadcn-ui-ui@latest -g

# Install shadcn-ui/ui components
RUN npx shadcn-ui@latest add input && \
    npx shadcn-ui@latest add label && \
    npx shadcn-ui@latest add checkbox && \
    npx shadcn-ui@latest add button && \
    npx shadcn-ui@latest add card && \
    npx shadcn-ui@latest add select && \
    npx shadcn-ui@latest add tabs && \
    npx shadcn-ui@latest add separator && \
    npx shadcn-ui@latest add scroll-area && \
    npx shadcn-ui@latest add sheet && \
    npx shadcn-ui@latest add dialog && \
    npx shadcn-ui@latest add table

# Install additional required packages
RUN npm install lucide-react framer-motion axios

# Set up Tailwind CSS
RUN npx tailwindcss init -p

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