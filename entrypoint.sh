#!/bin/bash
set -e

# Pull latest repo if AUTO_UPDATE=1
if [[ -d .git ]] && [[ "${AUTO_UPDATE}" == "1" ]]; then
    git pull
fi

# Install additional npm packages
if [[ ! -z "${NODE_PACKAGES}" ]]; then
    /usr/local/bin/npm install $NODE_PACKAGES
fi

# Uninstall packages if specified
if [[ ! -z "${UNNODE_PACKAGES}" ]]; then
    /usr/local/bin/npm uninstall $UNNODE_PACKAGES
fi

# Install dependencies from package.json
if [ -f /home/container/package.json ]; then
    /usr/local/bin/npm install
fi

# Run the main file
if [[ "${MAIN_FILE}" == *.js ]]; then
    /usr/local/bin/node "/home/container/${MAIN_FILE}"
elif [[ "${MAIN_FILE}" == *.ts ]]; then
    /usr/local/bin/npx --yes ts-node --esm "/home/container/${MAIN_FILE}"
else
    echo "Unsupported main file type: ${MAIN_FILE}"
    exit 1
fi
