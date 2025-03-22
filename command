#!/bin/bash
set -e  # Exit on error

# Function for error handling
handle_error() {
  echo "Error occurred at line $1"
  exit 1
}
trap 'handle_error $LINENO' ERR
