#!/bin/bash
# Script para compilar las gramáticas de Jison

GRAMMAR_DIR="src/lib/gramatica/lexer-parser"

echo "Compilando gramáticas..."

jison "$GRAMMAR_DIR/grammar-styles.jison" -o "$GRAMMAR_DIR/grammar-styles.js" -m commonjs
jison "$GRAMMAR_DIR/grammar-components.jison" -o "$GRAMMAR_DIR/grammar-components.js" -m commonjs
jison "$GRAMMAR_DIR/grammar-DB.jison" -o "$GRAMMAR_DIR/grammar-DB.js" -m commonjs
jison "$GRAMMAR_DIR/principal-grammar.jison" -o "$GRAMMAR_DIR/principal-grammar.js" -m commonjs

echo "Post-procesando gramáticas a ES modules..."
node post-compilar.js

echo "¡Gramáticas compiladas exitosamente!"
