#!/usr/bin/with-contenv bashio

# Get config values
DATABASE_PATH=$(bashio::config 'database_path')
API_PORT=$(bashio::config 'api_port')
LOG_LEVEL=$(bashio::config 'log_level')

# Create data directory if not exists
mkdir -p "$(dirname "$DATABASE_PATH")"

# Export environment variables
export DATABASE_PATH
export API_PORT
export LOG_LEVEL
export SUPERVISOR_TOKEN="${SUPERVISOR_TOKEN}"

bashio::log.info "Starting Roulez Jeunesse..."
bashio::log.info "Database: ${DATABASE_PATH}"
bashio::log.info "API Port: ${API_PORT}"

# Start the server
cd /app
exec node server/index.js
