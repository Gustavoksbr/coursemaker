#!/bin/sh
# Instala os runtimes no Piston. A lista vem de PISTON_PACKAGES, no formato "linguagem:versao" separados
# por espaco (o nome do pacote do JavaScript e "node", nao "javascript"). Rodar de novo e inofensivo:
# o Piston responde "Already installed".
set -u

echo "Esperando o Piston ficar de pe..."
until curl -sf http://piston:2000/api/v2/runtimes > /dev/null; do sleep 2; done

for pkg in $PISTON_PACKAGES; do
  lang="${pkg%%:*}"
  version="${pkg##*:}"
  echo "Instalando $lang $version..."
  curl -s -X POST http://piston:2000/api/v2/packages \
    -H 'Content-Type: application/json' \
    -d "{\"language\":\"$lang\",\"version\":\"$version\"}"
  echo
done

echo "Pacotes prontos."
