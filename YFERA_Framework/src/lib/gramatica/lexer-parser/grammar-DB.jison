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
#.*                             /* ignorar comentarios de línea */

"TABLE"                 return 'TABLA';
"COLUMNS"               return 'COLUMNAS';
"IN"                    return 'EN';
"DELETE"                return 'BORRAR';

"int"                   return 'TIPO_ENTERO';
"float"                 return 'TIPO_FLOTANTE';
"string"                return 'TIPO_CADENA';
"boolean"               return 'TIPO_BOOLEANO';
"char"                  return 'TIPO_CARACTER';

"true"                  return 'VERDADERO';
"false"                 return 'FALSO';

","                     return 'COMA';
"="                     return 'ASIGNACION';
"."                     return 'PUNTO';
";"                     return 'PUNTO_COMA';
"["                     return 'CORCHETE_ABRE';
"]"                     return 'CORCHETE_CIERRA';

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
  : /* vacio */
    { $$ = []; }
  | programa sentencia
    { $$ = $1.concat($2 ? [$2] : []); }
  ;

sentencia
  : crear_tabla PUNTO_COMA
    { $$ = $1; }
  | seleccionar_columna PUNTO_COMA
    { $$ = $1; }
  | insertar_registro
    { $$ = $1; }
  | actualizar_registro PUNTO_COMA
    { $$ = $1; }
  | eliminar_registro PUNTO_COMA
    { $$ = $1; }
  | error PUNTO_COMA {
      registrarErrorSintacticoActual('Sentencia DB invalida');
      yyerrok;
      $$ = null;
    }
  ;

crear_tabla
  : TABLA IDENTIFICADOR COLUMNAS lista_columnas
    { $$ = { tipo: 'create_table', tabla: $2, columnas: $4 }; }
  | TABLA error COLUMNAS lista_columnas {
      registrarErrorSintacticoActual('Creacion de tabla invalida');
      yyerrok;
      $$ = { tipo: 'create_table', tabla: null, columnas: $4 };
    }
  ;

lista_columnas
  : columna_def
    { $$ = [$1]; }
  | lista_columnas COMA columna_def
    { $$ = $1.concat([$3]); }
  ;

columna_def
  : IDENTIFICADOR ASIGNACION tipo_dato
    { $$ = { nombre: $1, tipo: $3 }; }
  ;

tipo_dato
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

seleccionar_columna
  : IDENTIFICADOR PUNTO IDENTIFICADOR
    { $$ = { tipo: 'select_column', tabla: $1, columna: $3 }; }
  | IDENTIFICADOR error IDENTIFICADOR {
      registrarErrorSintacticoActual('Consulta de columna invalida');
      yyerrok;
      $$ = { tipo: 'select_column', tabla: $1, columna: $3 };
    }
  ;

insertar_registro
  : IDENTIFICADOR CORCHETE_ABRE lista_asignaciones CORCHETE_CIERRA
    { $$ = { tipo: 'insert', tabla: $1, valores: $3 }; }
  | IDENTIFICADOR CORCHETE_ABRE lista_asignaciones CORCHETE_CIERRA PUNTO_COMA
    { $$ = { tipo: 'insert', tabla: $1, valores: $3 }; }
  | IDENTIFICADOR CORCHETE_ABRE error CORCHETE_CIERRA {
      registrarErrorSintacticoActual('Insercion de registro invalida');
      yyerrok;
      $$ = { tipo: 'insert', tabla: $1, valores: [] };
    }
  ;

actualizar_registro
  : IDENTIFICADOR CORCHETE_ABRE lista_asignaciones CORCHETE_CIERRA EN ENTERO
    { $$ = { tipo: 'update', tabla: $1, valores: $3, id: Number($6) }; }
  | IDENTIFICADOR CORCHETE_ABRE error CORCHETE_CIERRA EN ENTERO {
      registrarErrorSintacticoActual('Actualizacion de registro invalida');
      yyerrok;
      $$ = { tipo: 'update', tabla: $1, valores: [], id: Number($6) };
    }
  ;

eliminar_registro
  : IDENTIFICADOR BORRAR ENTERO
    { $$ = { tipo: 'delete', tabla: $1, id: Number($3) }; }
  | IDENTIFICADOR BORRAR error {
      registrarErrorSintacticoActual('Eliminacion de registro invalida');
      yyerrok;
      $$ = { tipo: 'delete', tabla: $1, id: null };
    }
  ;

lista_asignaciones
  : asignacion
    { $$ = [$1]; }
  | lista_asignaciones COMA asignacion
    { $$ = $1.concat([$3]); }
  ;

asignacion
  : IDENTIFICADOR ASIGNACION valor
    { $$ = { columna: $1, valor: $3 }; }
  ;

valor
  : CADENA
    { $$ = $1; }
  | CARACTER
    { $$ = $1; }
  | DECIMAL
    { $$ = Number($1); }
  | ENTERO
    { $$ = Number($1); }
  | VERDADERO
    { $$ = true; }
  | FALSO
    { $$ = false; }
  ;
