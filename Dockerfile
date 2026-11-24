FROM composer:2.10.3@sha256:b6dcd72ca98fa19d0e5b8476de179859704891fad06dd9e0b96833d4c430a5fc AS composer
FROM php:8.5.11-fpm-bookworm@sha256:9e1dc1e2000d88569f9673eb58b6026fe242067084d9008ceafb516a566574e3
RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libonig-dev libxml2-dev libzip-dev \
    && docker-php-ext-install -j"$(nproc)" mbstring pcntl zip \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer /usr/bin/composer /usr/local/bin/composer
WORKDIR /app
