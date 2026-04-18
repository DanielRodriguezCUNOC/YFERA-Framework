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
"/*"[\s\S]*?"*/"                   /* ignorar comentarios de bloque */
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
  | error EOF {
      registrarErrorSintacticoActual('Estructura principal invalida');
      yyerrok;
    }
  ;

lista_imports
  : /* vacio */
  | lista_imports import_stmt
  | lista_imports error PUNTO_COMA {
      registrarErrorSintacticoActual('Import invalido');
      yyerrok;
    }
  ;

import_stmt
  : IMPORTAR CADENA PUNTO_COMA
  | IMPORTAR error PUNTO_COMA {
      registrarErrorSintacticoActual('Import incompleto');
      yyerrok;
    }
  ;

lista_declaraciones
  : /* vacio */
  | lista_declaraciones declaracion
  | lista_declaraciones error PUNTO_COMA {
      registrarErrorSintacticoActual('Declaracion invalida');
      yyerrok;
    }
  ;

lista_funciones
  : /* vacio */
  | lista_funciones funcion
  | lista_funciones error LLAVE_CERRADA {
      registrarErrorSintacticoActual('Funcion invalida');
      yyerrok;
    }
  ;

bloque_main
  : MAIN LLAVE_ABIERTA lista_sentencias_main LLAVE_CERRADA
  | MAIN error LLAVE_CERRADA {
      registrarErrorSintacticoActual('Bloque main invalido');
      yyerrok;
    }
  ;

funcion
  : FUNCION IDENTIFICADOR PARENTESIS_ABIERTO PARENTESIS_CERRADO LLAVE_ABIERTA lista_sentencias_funcion LLAVE_CERRADA
  | FUNCION IDENTIFICADOR PARENTESIS_ABIERTO lista_parametros PARENTESIS_CERRADO LLAVE_ABIERTA lista_sentencias_funcion LLAVE_CERRADA
  | FUNCION error LLAVE_CERRADA {
      registrarErrorSintacticoActual('Funcion invalida');
      yyerrok;
    }
  ;

lista_parametros
  : parametro
  | lista_parametros COMA parametro
  ;

parametro
  : tipo IDENTIFICADOR
  ;

tipo
  : TIPO_ENTERO
  | TIPO_FLOTANTE
  | TIPO_CADENA
  | TIPO_BOOLEANO
  | TIPO_CARACTER
  ;

declaracion
  : tipo IDENTIFICADOR ASIGNACION expresion PUNTO_COMA
  | tipo CORCHETE_ABIERTO CORCHETE_CERRADO IDENTIFICADOR ASIGNACION arreglo_tamanio PUNTO_COMA
  | tipo CORCHETE_ABIERTO CORCHETE_CERRADO IDENTIFICADOR ASIGNACION arreglo_literal PUNTO_COMA
  | tipo CORCHETE_ABIERTO CORCHETE_CERRADO IDENTIFICADOR ASIGNACION EJECUTAR CONSULTA_DB PUNTO_COMA
  ;

arreglo_tamanio
  : CORCHETE_ABIERTO ENTERO CORCHETE_CERRADO
  ;

arreglo_literal
  : LLAVE_ABIERTA lista_expresiones LLAVE_CERRADA
  ;

lista_expresiones
  : expresion
  | lista_expresiones COMA expresion
  ;

lista_sentencias_funcion
  : /* vacio */
  | lista_sentencias_funcion sentencia_funcion
  | lista_sentencias_funcion error PUNTO_COMA {
      registrarErrorSintacticoActual('Sentencia invalida dentro de funcion');
      yyerrok;
    }
  ;

sentencia_funcion
  : EJECUTAR CONSULTA_DB PUNTO_COMA
  | CARGAR expresion PUNTO_COMA
  ;

lista_sentencias_main
  : /* vacio */
  | lista_sentencias_main sentencia_main
  | lista_sentencias_main error PUNTO_COMA {
      registrarErrorSintacticoActual('Sentencia invalida en main');
      yyerrok;
    }
  ;

sentencia_main
  : invocacion_componente PUNTO_COMA
  | asignacion PUNTO_COMA
  | ciclo_while
  | ciclo_for
  | condicional
  | error PUNTO_COMA {
      registrarErrorSintacticoActual('Sentencia principal invalida');
      yyerrok;
    }
  ;

invocacion_componente
  : DECORADOR IDENTIFICADOR PARENTESIS_ABIERTO PARENTESIS_CERRADO
  | DECORADOR IDENTIFICADOR PARENTESIS_ABIERTO lista_expresiones PARENTESIS_CERRADO
  ;

asignacion
  : IDENTIFICADOR ASIGNACION expresion
  | acceso_arreglo ASIGNACION expresion
  ;

ciclo_while
  : MIENTRAS PARENTESIS_ABIERTO expresion PARENTESIS_CERRADO LLAVE_ABIERTA lista_sentencias_main LLAVE_CERRADA
  ;

ciclo_for
  : PARA PARENTESIS_ABIERTO asignacion PUNTO_COMA expresion PUNTO_COMA paso_for PARENTESIS_CERRADO LLAVE_ABIERTA lista_sentencias_main LLAVE_CERRADA
  ;

paso_for
  : asignacion
  | IDENTIFICADOR ASIGNACION IDENTIFICADOR INCREMENTO
  | IDENTIFICADOR INCREMENTO
  ;

condicional
  : SI PARENTESIS_ABIERTO expresion PARENTESIS_CERRADO LLAVE_ABIERTA lista_sentencias_main LLAVE_CERRADA
  | SI PARENTESIS_ABIERTO expresion PARENTESIS_CERRADO LLAVE_ABIERTA lista_sentencias_main LLAVE_CERRADA SINO LLAVE_ABIERTA lista_sentencias_main LLAVE_CERRADA
  ;

expresion
  : expr_logica
  ;

expr_logica
  : expr_relacional
  | expr_logica AND expr_relacional
  | expr_logica OR expr_relacional
  ;

expr_relacional
  : expr_aritmetica
  | expr_aritmetica IGUALDAD expr_aritmetica
  | expr_aritmetica NO_IGUAL expr_aritmetica
  | expr_aritmetica MENOR expr_aritmetica
  | expr_aritmetica MAYOR expr_aritmetica
  | expr_aritmetica MENOR_IGUAL expr_aritmetica
  | expr_aritmetica MAYOR_IGUAL expr_aritmetica
  ;

expr_aritmetica
  : termino
  | expr_aritmetica SUMA termino
  | expr_aritmetica RESTA termino
  ;

termino
  : factor
  | termino MULTIPLICACION factor
  | termino DIVISION factor
  ;

factor
  : ENTERO
  | DECIMAL
  | CADENA
  | CARACTER
  | VERDADERO
  | FALSO
  | IDENTIFICADOR
  | acceso_arreglo
  | PARENTESIS_ABIERTO expresion PARENTESIS_CERRADO
  ;

acceso_arreglo
  : IDENTIFICADOR CORCHETE_ABIERTO expresion CORCHETE_CERRADO
  ;
