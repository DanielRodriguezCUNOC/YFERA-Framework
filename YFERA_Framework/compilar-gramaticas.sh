#!/bin/bash
# Script para compilar las gramáticas de Jison

GRAMMAR_DIR="src/lib/gramatica/lexer-parser"

echo "Compilando gramáticas..."

jison "$GRAMMAR_DIR/grammar-styles.jison" -o "$GRAMMAR_DIR/grammar-styles.js"
jison "$GRAMMAR_DIR/grammar-components.jison" -o "$GRAMMAR_DIR/grammar-components.js"
jison "$GRAMMAR_DIR/grammar-DB.jison" -o "$GRAMMAR_DIR/grammar-DB.js"
jison "$GRAMMAR_DIR/principal-grammar.jison" -o "$GRAMMAR_DIR/principal-grammar.js"

echo "¡Gramáticas compiladas exitosamente!"
