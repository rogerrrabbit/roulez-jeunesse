ARG BUILD_FROM
FROM ${BUILD_FROM} AS build

# Build dependencies (better-sqlite3 needs a compiler toolchain on Alpine)
RUN apk add --no-cache nodejs npm python3 make g++ sqlite-dev

WORKDIR /build

# --- Frontend build (Vite) ---
COPY package.json package-lock.json index.html vite.config.ts tsconfig*.json ./
COPY src/ ./src/
COPY public/ ./public/

RUN npm ci \
	&& npm run build

# --- Backend install ---
WORKDIR /build/server
COPY server/package.json ./
RUN npm install --omit=dev
COPY server/ ./


FROM ${BUILD_FROM}

# Runtime dependencies
RUN apk add --no-cache nodejs sqlite libstdc++

WORKDIR /app

COPY --from=build /build/dist ./dist
COPY --from=build /build/server ./server

COPY run.sh /
RUN chmod a+x /run.sh

EXPOSE 8099

CMD [ "/run.sh" ]
