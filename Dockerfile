# Runtime image for checklist-api. Built ON the VPS by deploy.sh (no registry).
#
# node:26-alpine to match CI's node:26 major - testing on a different major
# than the image builds on lets "green in CI, broken in the image" through.
FROM node:26-alpine

# The @citadel/contracts dependency is a git URL; the lockfile records it as
# git+ssh, and this image has no SSH key. Route it over anonymous https - the
# repositories are public (DEC-015).
RUN apk add --no-cache git \
 && git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY src ./src
COPY migrations ./migrations

ENV NODE_ENV=production
EXPOSE 8081
USER node
CMD ["node", "src/server.js"]
