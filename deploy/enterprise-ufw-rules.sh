#!/usr/bin/env bash
set -euo pipefail

# ITD-OPMS Enterprise UFW Rules
#
# This script applies the baseline inbound policy from docs/ENTERPRISE_REQUIRED_PORTS.md.
#
# Usage:
#   sudo bash deploy/enterprise-ufw-rules.sh
#
# Optional environment variables (comma-separated CIDRs):
#   ADMIN_CIDRS="10.20.0.0/24,10.20.1.0/24"
#   USER_CIDRS="10.0.0.0/8"
#   INTEGRATION_CIDRS="10.30.0.0/24"
#   OBSERVABILITY_CIDRS="10.40.0.0/24"
#
# Optional toggles:
#   RESET_RULES=true
#   STRICT_EGRESS=true
#   ENABLE_GRAFANA=true
#   ENABLE_PROMETHEUS=true
#   ENABLE_ALERTMANAGER=true
#   ENABLE_MINIO_CONSOLE=true
#   ENABLE_MINIO_S3=true
#   ENABLE_NATS_MONITOR=true
#   ENABLE_OTLP_GRPC=true
#   ENABLE_OTLP_HTTP=true
#   ASSUME_YES=true

if ! command -v ufw >/dev/null 2>&1; then
  echo "ERROR: ufw is not installed."
  exit 1
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "ERROR: run as root (sudo)."
  exit 1
fi

RESET_RULES="${RESET_RULES:-false}"
STRICT_EGRESS="${STRICT_EGRESS:-false}"
ASSUME_YES="${ASSUME_YES:-false}"

ENABLE_GRAFANA="${ENABLE_GRAFANA:-false}"
ENABLE_PROMETHEUS="${ENABLE_PROMETHEUS:-false}"
ENABLE_ALERTMANAGER="${ENABLE_ALERTMANAGER:-false}"
ENABLE_MINIO_CONSOLE="${ENABLE_MINIO_CONSOLE:-false}"
ENABLE_MINIO_S3="${ENABLE_MINIO_S3:-false}"
ENABLE_NATS_MONITOR="${ENABLE_NATS_MONITOR:-false}"
ENABLE_OTLP_GRPC="${ENABLE_OTLP_GRPC:-false}"
ENABLE_OTLP_HTTP="${ENABLE_OTLP_HTTP:-false}"

ADMIN_CIDRS="${ADMIN_CIDRS:-10.10.10.0/24}"
USER_CIDRS="${USER_CIDRS:-10.0.0.0/8}"
INTEGRATION_CIDRS="${INTEGRATION_CIDRS:-10.30.0.0/24}"
OBSERVABILITY_CIDRS="${OBSERVABILITY_CIDRS:-10.40.0.0/24}"

csv_to_array() {
  local csv="$1"
  local -n out_ref="$2"
  IFS=',' read -r -a out_ref <<< "${csv}"
}

trim() {
  echo "$1" | xargs
}

add_allow_from_cidrs() {
  local port="$1"
  local proto="$2"
  local comment="$3"
  shift 3

  local cidr
  for cidr in "$@"; do
    cidr="$(trim "${cidr}")"
    [[ -z "${cidr}" ]] && continue
    ufw allow proto "${proto}" from "${cidr}" to any port "${port}" comment "${comment}"
  done
}

add_allow_out() {
  local port="$1"
  local proto="$2"
  local comment="$3"
  ufw allow out proto "${proto}" to any port "${port}" comment "${comment}"
}

csv_to_array "${ADMIN_CIDRS}" ADMIN_CIDR_LIST
csv_to_array "${USER_CIDRS}" USER_CIDR_LIST
csv_to_array "${INTEGRATION_CIDRS}" INTEGRATION_CIDR_LIST
csv_to_array "${OBSERVABILITY_CIDRS}" OBSERVABILITY_CIDR_LIST

echo "Applying ITD-OPMS UFW baseline..."
echo "  RESET_RULES=${RESET_RULES}"
echo "  STRICT_EGRESS=${STRICT_EGRESS}"

if [[ -n "${SSH_CONNECTION:-}" ]]; then
  echo "WARNING: SSH session detected. Ensure current admin source IP is in ADMIN_CIDRS before applying rules."
fi

if [[ "${ASSUME_YES}" != "true" ]]; then
  echo ""
  read -r -p "Continue applying firewall rules? Type 'yes' to continue: " confirm
  if [[ "${confirm}" != "yes" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

if [[ "${RESET_RULES}" == "true" ]]; then
  ufw --force reset
fi

ufw default deny incoming
if [[ "${STRICT_EGRESS}" == "true" ]]; then
  ufw default deny outgoing
else
  ufw default allow outgoing
fi

# Mandatory inbound ports
add_allow_from_cidrs 22 tcp "ITD-OPMS SSH admin" "${ADMIN_CIDR_LIST[@]}"
add_allow_from_cidrs 80 tcp "ITD-OPMS HTTP redirect" "${USER_CIDR_LIST[@]}"
add_allow_from_cidrs 443 tcp "ITD-OPMS HTTPS ingress" "${USER_CIDR_LIST[@]}"

# Conditional inbound ports
if [[ "${ENABLE_GRAFANA}" == "true" ]]; then
  add_allow_from_cidrs 3001 tcp "ITD-OPMS Grafana admin" "${ADMIN_CIDR_LIST[@]}"
fi

if [[ "${ENABLE_PROMETHEUS}" == "true" ]]; then
  add_allow_from_cidrs 9090 tcp "ITD-OPMS Prometheus admin" "${ADMIN_CIDR_LIST[@]}"
fi

if [[ "${ENABLE_ALERTMANAGER}" == "true" ]]; then
  add_allow_from_cidrs 9093 tcp "ITD-OPMS Alertmanager admin" "${ADMIN_CIDR_LIST[@]}"
fi

if [[ "${ENABLE_MINIO_CONSOLE}" == "true" ]]; then
  add_allow_from_cidrs 9011 tcp "ITD-OPMS MinIO console" "${ADMIN_CIDR_LIST[@]}"
fi

if [[ "${ENABLE_MINIO_S3}" == "true" ]]; then
  add_allow_from_cidrs 9010 tcp "ITD-OPMS MinIO S3 integration" "${INTEGRATION_CIDR_LIST[@]}"
fi

if [[ "${ENABLE_NATS_MONITOR}" == "true" ]]; then
  add_allow_from_cidrs 8222 tcp "ITD-OPMS NATS monitor" "${ADMIN_CIDR_LIST[@]}"
fi

if [[ "${ENABLE_OTLP_GRPC}" == "true" ]]; then
  add_allow_from_cidrs 4317 tcp "ITD-OPMS OTLP gRPC ingest" "${OBSERVABILITY_CIDR_LIST[@]}"
fi

if [[ "${ENABLE_OTLP_HTTP}" == "true" ]]; then
  add_allow_from_cidrs 4318 tcp "ITD-OPMS OTLP HTTP ingest" "${OBSERVABILITY_CIDR_LIST[@]}"
fi

# Optional strict egress controls
if [[ "${STRICT_EGRESS}" == "true" ]]; then
  add_allow_out 443 tcp "ITD-OPMS HTTPS egress"
  add_allow_out 587 tcp "ITD-OPMS SMTP relay"
  add_allow_out 53 udp "ITD-OPMS DNS UDP"
  add_allow_out 53 tcp "ITD-OPMS DNS TCP"
  add_allow_out 123 udp "ITD-OPMS NTP"
fi

ufw --force enable
ufw status verbose

echo ""
echo "Firewall baseline applied."
echo "Run 'ufw status numbered' to review active rules."
