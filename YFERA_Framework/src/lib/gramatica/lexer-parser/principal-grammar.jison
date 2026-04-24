/*
* Analizador Lexico
*/

%{

  const erroresLexicos = [];
  const erroresSintacticos = [];

  function resgistrarErrorLexico(lexema, linea, columna){
    erroresLexicos.push({
      tipo: 'lexico',
      lexema,
      linea,
      columna,
      mensaje: `Token no reconocido: ${lexema}`
    });
  }

  function registrarErrorSintactico(mensaje, lexema, linea, columna){
    erroresSintacticos.push({
      tipo: 'sintactico',
      lexema,
      linea,
      columna,
      mensaje
    });
  }

  function registrarErrorSintacticoActual(mensaje){
    const linea = yylloc?.first_line || yylineno || 0;
    const columna = yylloc?.first_column ?? 0;
    const lexema = yytext || '';
    registrarErrorSintactico(mensaje, lexema, linea, columna);
  }
%}

%lex
%options ranges yylineno
%%

\s+                                 /* ignorar espacios y saltos */
[\u200B\u200C\u200D\uFEFF\u00A0]+ /* ignorar invisibles y nbsp */
"#".*                                /* ignorar comentarios de linea */

"import"                return 'IMPORTAR';
"execute"               return 'EJECUTAR';
"load"                  return 'CARGAR';
"main"                  return 'MAIN';
"function"              return 'FUNCION';
"while"                 return 'MIENTRAS';
"for"                   return 'PARA';
"if"                    return 'SI';
"else"                  return 'SINO';

"int"                   return 'TIPO_ENTERO';
"float"                 return 'TIPO_FLOTANTE';
"string"                return 'TIPO_CADENA';
"boolean"               return 'TIPO_BOOLEANO';
"char"                  return 'TIPO_CARACTER';

"True"                  return 'VERDADERO';
"False"                 return 'FALSO';
"true"                  return 'VERDADERO';
"false"                 return 'FALSO';

"=="                    return 'IGUALDAD';
"!="                    return 'NO_IGUAL';
"<="                    return 'MENOR_IGUAL';
">="                    return 'MAYOR_IGUAL';
"<"                     return 'MENOR';
">"                     return 'MAYOR';
"&&"                    return 'AND';
"||"                    return 'OR';
"++"                    return 'INCREMENTO';

";"                     return 'PUNTO_COMA';
","                     return 'COMA';
"="                     return 'ASIGNACION';
"("                     return 'PARENTESIS_ABIERTO';
")"                     return 'PARENTESIS_CERRADO';
"{"                     return 'LLAVE_ABIERTA';
"}"                     return 'LLAVE_CERRADA';
"["                     return 'CORCHETE_ABIERTO';
"]"                     return 'CORCHETE_CERRADO';
"@"                     return 'DECORADOR';
"+"                     return 'SUMA';
"-"                     return 'RESTA';
"*"                     return 'MULTIPLICACION';
"/"                     return 'DIVISION';
"."                     return 'PUNTO';

"`"[^`]*"`"            return 'CONSULTA_DB';
\"[^\"]*\"                            return 'CADENA';
\'[^\']\'                             return 'CARACTER';
[0-9]+"."[0-9]+                        return 'DECIMAL';
[0-9]+                                  return 'ENTERO';
[a-zA-Z_][a-zA-Z0-9_]*                  return 'IDENTIFICADOR';

<<EOF>>                 return 'EOF';

. {
  const linea = yylloc?.first_line || (yylineno);
  const columna = (yylloc?.first_column ?? 0);
  resgistrarErrorLexico(yytext, linea, columna);
}

/lex

/*
* Analizador Sintactico
*/

%start programa

%%

programa
  : lista_imports lista_declaraciones lista_funciones bloque_main
    { $$ = { imports: $1, declaraciones: $2, funciones: $3, main: $4 }; }
  | error EOF {
      registrarErrorSintacticoActual('Estructura principal invalida');
      yyerrok;
      $$ = { imports: [], declaraciones: [], funciones: [], main: null };
    }
  ;

lista_imports
  : /* vacio */
    { $$ = []; }
  | lista_imports import_stmt
    { $$ = $2 ? $1.concat([$2]) : $1; }
  | lista_imports error PUNTO_COMA {
      registrarErrorSintacticoActual('Import invalido');
      yyerrok;
      $$ = $1;
    }
  ;

import_stmt
  : IMPORTAR CADENA PUNTO_COMA
    { $$ = { tipo: 'import', ruta: $2 }; }
  | IMPORTAR error PUNTO_COMA {
      registrarErrorSintacticoActual('Import incompleto');
      yyerrok;
      $$ = null;
    }
  ;

lista_declaraciones
  : /* vacio */
    { $$ = []; }
  | lista_declaraciones declaracion
    { $$ = $1.concat([$2]); }
  | lista_declaraciones error PUNTO_COMA {
      registrarErrorSintacticoActual('Declaracion invalida');
      yyerrok;
      $$ = $1;
    }
  ;

lista_funciones
  : /* vacio */
    { $$ = []; }
  | lista_funciones funcion
    { $$ = $2 ? $1.concat([$2]) : $1; }
  | lista_funciones error LLAVE_CERRADA {
      registrarErrorSintacticoActual('Funcion invalida');
      yyerrok;
      $$ = $1;
    }
  ;

bloque_main
  : MAIN LLAVE_ABIERTA lista_sentencias_main LLAVE_CERRADA
    { $$ = { tipo: 'main', sentencias: $3 }; }
  | MAIN error LLAVE_CERRADA {
      registrarErrorSintacticoActual('Bloque main invalido');
      yyerrok;
      $$ = { tipo: 'main', sentencias: [] };
    }
  ;

funcion
  : FUNCION IDENTIFICADOR PARENTESIS_ABIERTO PARENTESIS_CERRADO LLAVE_ABIERTA lista_sentencias_funcion LLAVE_CERRADA
    { $$ = { tipo: 'funcion', nombre: $2, parametros: [], sentencias: $6 }; }
  | FUNCION IDENTIFICADOR PARENTESIS_ABIERTO lista_parametros PARENTESIS_CERRADO LLAVE_ABIERTA lista_sentencias_funcion LLAVE_CERRADA
    { $$ = { tipo: 'funcion', nombre: $2, parametros: $4, sentencias: $7 }; }
  | FUNCION error LLAVE_CERRADA {
      registrarErrorSintacticoActual('Funcion invalida');
      yyerrok;
      $$ = null;
    }
  ;

lista_parametros
  : parametro
    { $$ = [$1]; }
  | lista_parametros COMA parametro
    { $$ = $1.concat([$3]); }
  ;

parametro
  : tipo IDENTIFICADOR
    { $$ = { tipo: $1, id: $2 }; }
  ;

tipo
  : TIPO_ENTERO
    { $$ = 'int'; }
  | TIPO_FLOTANTE
    { $$ = 'float'; }
  | TIPO_CADENA
    { $$ = 'string'; }
  | TIPO_BOOLEANO
    { $$ = 'boolean'; }
  | TIPO_CARACTER
    { $$ = 'char'; }
  ;

declaracion
  : tipo IDENTIFICADOR ASIGNACION expresion PUNTO_COMA
    { $$ = { tipo: 'declaracion', dato: $1, id: $2, valor: $4 }; }
  | tipo CORCHETE_ABIERTO CORCHETE_CERRADO IDENTIFICADOR ASIGNACION arreglo_tamanio PUNTO_COMA
    { $$ = { tipo: 'arreglo_tamanio', dato: $1, id: $4, valor: $6 }; }
  | tipo CORCHETE_ABIERTO CORCHETE_CERRADO IDENTIFICADOR ASIGNACION arreglo_literal PUNTO_COMA
    { $$ = { tipo: 'arreglo_literal', dato: $1, id: $4, valor: $6 }; }
  | tipo CORCHETE_ABIERTO CORCHETE_CERRADO IDENTIFICADOR ASIGNACION EJECUTAR CONSULTA_DB PUNTO_COMA
    { $$ = { tipo: 'arreglo_execute', dato: $1, id: $4, consulta: $7 }; }
  ;

arreglo_tamanio
  : CORCHETE_ABIERTO ENTERO CORCHETE_CERRADO
    { $$ = { size: Number($2) }; }
  ;

arreglo_literal
  : LLAVE_ABIERTA lista_expresiones LLAVE_CERRADA
    { $$ = $2; }
  ;

lista_expresiones
  : expresion
    { $$ = [$1]; }
  | lista_expresiones COMA expresion
    { $$ = $1.concat([$3]); }
  ;

lista_sentencias_funcion
  : /* vacio */
    { $$ = []; }
  | lista_sentencias_funcion sentencia_funcion
    { $$ = $1.concat([$2]); }
  | lista_sentencias_funcion error PUNTO_COMA {
      registrarErrorSintacticoActual('Sentencia invalida dentro de funcion');
      yyerrok;
      $$ = $1;
    }
  ;

sentencia_funcion
  : EJECUTAR CONSULTA_DB PUNTO_COMA
    { $$ = { tipo: 'execute', consulta: $2 }; }
  | CARGAR expresion PUNTO_COMA
    { $$ = { tipo: 'load', valor: $2 }; }
  ;

lista_sentencias_main
  : /* vacio */
    { $$ = []; }
  | lista_sentencias_main sentencia_main
    { $$ = $1.concat($2 ? [$2] : []); }
  | lista_sentencias_main error PUNTO_COMA {
      registrarErrorSintacticoActual('Sentencia invalida en main');
      yyerrok;
      $$ = $1;
    }
  ;

sentencia_main
  : invocacion_componente PUNTO_COMA
    { $$ = $1; }
  | asignacion PUNTO_COMA
    { $$ = $1; }
  | ciclo_while
    { $$ = $1; }
  | ciclo_for
    { $$ = $1; }
  | condicional
    { $$ = $1; }
  | error PUNTO_COMA {
      registrarErrorSintacticoActual('Sentencia principal invalida');
      yyerrok;
      $$ = null;
    }
  ;

invocacion_componente
  : DECORADOR IDENTIFICADOR PARENTESIS_ABIERTO PARENTESIS_CERRADO
    { $$ = { tipo: 'invocacion', componente: $2, args: [] }; }
  | DECORADOR IDENTIFICADOR PARENTESIS_ABIERTO lista_expresiones PARENTESIS_CERRADO
    { $$ = { tipo: 'invocacion', componente: $2, args: $4 }; }
  ;

asignacion
  : IDENTIFICADOR ASIGNACION expresion
    { $$ = { tipo: 'asignacion', target: { tipo: 'id', valor: $1 }, valor: $3 }; }
  | acceso_arreglo ASIGNACION expresion
    { $$ = { tipo: 'asignacion', target: $1, valor: $3 }; }
  ;

ciclo_while
  : MIENTRAS PARENTESIS_ABIERTO expresion PARENTESIS_CERRADO LLAVE_ABIERTA lista_sentencias_main LLAVE_CERRADA
    { $$ = { tipo: 'while', condicion: $3, cuerpo: $6 }; }
  ;

ciclo_for
  : PARA PARENTESIS_ABIERTO asignacion PUNTO_COMA expresion PUNTO_COMA paso_for PARENTESIS_CERRADO LLAVE_ABIERTA lista_sentencias_main LLAVE_CERRADA
    { $$ = { tipo: 'for', init: $3, condicion: $5, paso: $7, cuerpo: $10 }; }
  ;

paso_for
  : asignacion
    { $$ = $1; }
  | IDENTIFICADOR ASIGNACION IDENTIFICADOR INCREMENTO
    { $$ = { tipo: 'post_increment_assign', id: $1, valor: $3 }; }
  | IDENTIFICADOR INCREMENTO
    { $$ = { tipo: 'post_increment', id: $1 }; }
  ;

condicional
  : SI PARENTESIS_ABIERTO expresion PARENTESIS_CERRADO LLAVE_ABIERTA lista_sentencias_main LLAVE_CERRADA
    { $$ = { tipo: 'if', condicion: $3, then: $6, else: null }; }
  | SI PARENTESIS_ABIERTO expresion PARENTESIS_CERRADO LLAVE_ABIERTA lista_sentencias_main LLAVE_CERRADA SINO LLAVE_ABIERTA lista_sentencias_main LLAVE_CERRADA
    { $$ = { tipo: 'if', condicion: $3, then: $6, else: $10 }; }
  ;

expresion
  : expr_logica
    { $$ = $1; }
  ;

expr_logica
  : expr_relacional
    { $$ = $1; }
  | expr_logica AND expr_relacional
    { $$ = { op: '&&', left: $1, right: $3 }; }
  | expr_logica OR expr_relacional
    { $$ = { op: '||', left: $1, right: $3 }; }
  ;

expr_relacional
  : expr_aritmetica
    { $$ = $1; }
  | expr_aritmetica IGUALDAD expr_aritmetica
    { $$ = { op: '==', left: $1, right: $3 }; }
  | expr_aritmetica NO_IGUAL expr_aritmetica
    { $$ = { op: '!=', left: $1, right: $3 }; }
  | expr_aritmetica MENOR expr_aritmetica
    { $$ = { op: '<', left: $1, right: $3 }; }
  | expr_aritmetica MAYOR expr_aritmetica
    { $$ = { op: '>', left: $1, right: $3 }; }
  | expr_aritmetica MENOR_IGUAL expr_aritmetica
    { $$ = { op: '<=', left: $1, right: $3 }; }
  | expr_aritmetica MAYOR_IGUAL expr_aritmetica
    { $$ = { op: '>=', left: $1, right: $3 }; }
  ;

expr_aritmetica
  : termino
    { $$ = $1; }
  | expr_aritmetica SUMA termino
    { $$ = { op: '+', left: $1, right: $3 }; }
  | expr_aritmetica RESTA termino
    { $$ = { op: '-', left: $1, right: $3 }; }
  ;

termino
  : factor
    { $$ = $1; }
  | termino MULTIPLICACION factor
    { $$ = { op: '*', left: $1, right: $3 }; }
  | termino DIVISION factor
    { $$ = { op: '/', left: $1, right: $3 }; }
  ;

factor
  : ENTERO
    { $$ = Number($1); }
  | DECIMAL
    { $$ = Number($1); }
  | CADENA
    { $$ = $1; }
  | CARACTER
    { $$ = $1; }
  | VERDADERO
    { $$ = true; }
  | FALSO
    { $$ = false; }
  | IDENTIFICADOR
    { $$ = { tipo: 'id', valor: $1 }; }
  | acceso_arreglo
    { $$ = $1; }
  | PARENTESIS_ABIERTO expresion PARENTESIS_CERRADO
    { $$ = $2; }
  ;

acceso_arreglo
  : IDENTIFICADOR CORCHETE_ABIERTO expresion CORCHETE_CERRADO
    { $$ = { tipo: 'acceso_arreglo', id: $1, indice: $3 }; }
  ;
