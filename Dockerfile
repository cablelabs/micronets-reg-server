FROM node:8

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json .
COPY package.json package-lock.json ./

# Allow URL for MSO Portal. Default is "http://localhost:3010"
ENV mso_portal_url="http://localhost:3010"

RUN npm install

# Bundle app source
COPY . .

EXPOSE 3000
CMD [ "npm", "start" ]