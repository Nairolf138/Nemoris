#!/usr/bin/env ruby
# frozen_string_literal: true

require 'yaml'

SPEC_PATH = 'docs/product-capsule/openapi.yaml'
REQUIRED_PATHS = %w[
  /auth/register
  /auth/login
  /auth/logout
  /memories
  /beliefs
  /lessons
  /value_profiles
  /legacy_messages
  /exports
  /observability/health
  /observability/metrics
  /observability/audit-events
].freeze
EXPECTED_ERROR_CODES = %w[
  INVALID_PAYLOAD
  INVALID_EMAIL
  WEAK_PASSWORD
  INVALID_EXPORT_FORMAT
  INVALID_OWNER_SCOPE
  INVALID_QUERY_PARAMS
  OWNER_SCOPE_REQUIRED
  DOMAIN_VALIDATION_ERROR
  UNAUTHENTICATED
  INVALID_CREDENTIALS
  SESSION_INVALID
  SESSION_NOT_FOUND
  FORBIDDEN
  NOT_FOUND
  RESOURCE_NOT_FOUND
  EXPORT_NOT_FOUND
  EMAIL_ALREADY_USED
  RATE_LIMITED
  INTERNAL_ERROR
].freeze

unless File.exist?(SPEC_PATH)
  abort("OpenAPI file missing: #{SPEC_PATH}")
end

doc = YAML.safe_load(File.read(SPEC_PATH), permitted_classes: [], aliases: true)
errors = []

errors << 'Top-level `openapi` field is missing' unless doc.is_a?(Hash) && doc['openapi']
errors << 'Top-level `paths` field is missing' unless doc.is_a?(Hash) && doc['paths'].is_a?(Hash)

if doc.is_a?(Hash) && doc['paths'].is_a?(Hash)
  missing_paths = REQUIRED_PATHS - doc['paths'].keys
  errors << "Missing required paths: #{missing_paths.join(', ')}" unless missing_paths.empty?
end

enum = doc.dig('components', 'schemas', 'ErrorResponse', 'properties', 'error', 'enum')
unless enum.is_a?(Array)
  errors << 'ErrorResponse.properties.error.enum must be defined'
else
  missing_codes = EXPECTED_ERROR_CODES - enum
  extra_codes = enum - EXPECTED_ERROR_CODES
  errors << "Missing error codes: #{missing_codes.join(', ')}" unless missing_codes.empty?
  errors << "Unexpected error codes: #{extra_codes.join(', ')}" unless extra_codes.empty?
end

if errors.empty?
  puts "OpenAPI lint passed: #{SPEC_PATH}"
  exit 0
end

warn 'OpenAPI lint failed:'
errors.each { |error| warn "- #{error}" }
exit 1
