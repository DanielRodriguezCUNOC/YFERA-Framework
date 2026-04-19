/*
* Analizador semántico para los estilos
*/

class AnalizadorSemanticoEstilos {

    constructor() {
        this.errores = [];
        this.selectoresDeclarados = {};
        this.maxIteracionesFor = 10000;
    }

    agregarError(mensaje, extra = {}) {
        this.errores.push({
            tipo: 'Error Semántico',
            mensaje,
            linea: null,
            columna: null,
            ...extra
        });
    }

    analizar(ast) {
        this.errores = [];
        this.selectoresDeclarados = {};

        if (!Array.isArray(ast)) {
            this.agregarError('El AST de estilos debe ser un arreglo');
            return { ok: false, errores: this.errores };
        }

        this.recolectarSelectores(ast);
        this.validarSentencias(ast);

        return { ok: this.errores.length === 0, errores: this.errores };
    }

    recolectarSelectores(sentencias) {
        for (let i = 0; i < sentencias.length; i++) {
            const s = sentencias[i];
            if (!s || !s.tipo) continue;

            if (s.tipo === 'estilo') {
                this.registrarSelectorEstatico(s.selector);
            } else if (s.tipo === 'for' && Array.isArray(s.estilos)) {
                for (let j = 0; j < s.estilos.length; j++) {
                    const est = s.estilos[j];
                    if (est && est.tipo === 'estilo') {
                        this.registrarSelectorEstatico(est.selector);
                    }
                }
            }
        }
    }

    esSelectorValido(selector) {
       if(typeof selector !== 'string') return false;
       if(selector.length === 0) return false;
        for(let i = 0; i < selector.length; i++) {
            const c = selector.charAt(i);
            switch(c) {
              case ' ':
              case '\t':
              case '\n':
              case '\r':
              case '{':
              case '}':
              case ';':
              case ',':
              case '(':
              case ')':
                return false;
              default:
                break;
            }
        }
        return true;
    }

    esHexColorValido(hex) {
        if (typeof hex !== 'string') return false;
        if (hex.length !== 4 && hex.length !== 7) return false;
        if (hex.charAt(0) !== '#') return false;

        for (let i = 1; i < hex.length; i++) {
            const c = hex.charAt(i);
            const esNumero = c >= '0' && c <= '9';
            const esHexMin = c >= 'a' && c <= 'f';
            const esHexMay = c >= 'A' && c <= 'F';
            if (!esNumero && !esHexMin && !esHexMay) return false;
        }

        return true;
    }

    registrarSelectorEstatico(selector) {
        if (!this.esSelectorValido(selector)) {
            this.agregarError(`Selector inválido: ${String(selector)}`);
            return;
        }

        if (selector.indexOf('$') !== -1) return;

        if (this.selectoresDeclarados[selector]) {
            this.agregarError(`Selector duplicado: ${selector}`);
            return;
        }

        this.selectoresDeclarados[selector] = true;
    }

    validarSentencias(sentencias) {
        for (let i = 0; i < sentencias.length; i++) {
            const s = sentencias[i];
            if (!s || !s.tipo) {
                this.agregarError('Sentencia inválida');
                continue;
            }

            if (s.tipo === 'estilo') {
                this.validarEstilo(s, null);
            } else if (s.tipo === 'for') {
                this.validarFor(s);
            } else {
                this.agregarError(`Tipo de sentencia no soportado: ${s.tipo}`);
            }
        }
    }

    validarFor(nodo) {
        if (typeof nodo.variable !== 'string' || nodo.variable.charAt(0) !== '$') {
            this.agregarError('Variable de for inválida');
        }

        const desde = this.evaluarExprRangoSinVariables(nodo.desde, 'for.desde');
        const hasta = this.evaluarExprRangoSinVariables(nodo.hasta, 'for.hasta');

        if (typeof desde === 'number' && typeof hasta === 'number') {
            if (!Number.isInteger(desde) || !Number.isInteger(hasta)) {
                this.agregarError('Los límites del for deben ser enteros');
            } else {
                let iteraciones = 0;
                if (nodo.inclusivo) iteraciones = Math.abs(hasta - desde) + 1;
                else iteraciones = Math.abs(hasta - desde);

                if (iteraciones > this.maxIteracionesFor) {
                    this.agregarError(`El for excede el máximo de iteraciones (${this.maxIteracionesFor})`);
                }
            }
        }

        if (!Array.isArray(nodo.estilos)) {
            this.agregarError('El for debe contener estilos');
            return;
        }

        for (let i = 0; i < nodo.estilos.length; i++) {
            this.validarEstilo(nodo.estilos[i], nodo.variable);
        }
    }

    validarEstilo(estilo, variableFor) {
        if (!estilo || estilo.tipo !== 'estilo') {
            this.agregarError('Nodo de estilo inválido');
            return;
        }

        if (!this.esSelectorValido(estilo.selector)) {
            this.agregarError(`Selector inválido: ${String(estilo.selector)}`);
        }

        if (estilo.extiende) {
            if (!this.esSelectorValido(estilo.extiende)) {
                this.agregarError(`Selector inválido en extiende: ${String(estilo.extiende)}`);
            }

            if (estilo.extiende === estilo.selector) {
                this.agregarError(`Un estilo no puede extenderse a sí mismo: ${estilo.selector}`);
            }

            if (typeof estilo.extiende === 'string' && estilo.extiende.indexOf('$') === -1) {
                if (!this.selectoresDeclarados[estilo.extiende]) {
                    this.agregarError(`El estilo base no existe para extiende: ${estilo.extiende}`);
                }
            }
        }

        if (!Array.isArray(estilo.propiedades)) {
            this.agregarError(`Lista de propiedades inválida en ${String(estilo.selector)}`);
            return;
        }

        const propsVistas = {};
        for (let i = 0; i < estilo.propiedades.length; i++) {
            const p = estilo.propiedades[i];
            if (!p || typeof p.propiedad !== 'string') {
                this.agregarError(`Propiedad inválida en ${String(estilo.selector)}`);
                continue;
            }

            if (propsVistas[p.propiedad]) {
                this.agregarError(`Propiedad duplicada "${p.propiedad}" en "${estilo.selector}"`);
            } else {
                propsVistas[p.propiedad] = true;
            }

            this.validarPropiedad(p.propiedad, p.valor, variableFor);
        }
    }

    validarPropiedad(nombre, valor, variableFor) {
        // enums
        if (nombre === 'text-align') {
            if (!(valor === 'CENTER' || valor === 'RIGHT' || valor === 'LEFT')) {
                this.agregarError(`Valor inválido para text-align: ${String(valor)}`);
            }
            return;
        }

        if (nombre === 'text-font') {
            if (!(valor === 'HELVETICA' || valor === 'SANS' || valor === 'SANS SERIF' || valor === 'MONO' || valor === 'CURSIVE')) {
                this.agregarError(`Valor inválido para text-font: ${String(valor)}`);
            }
            return;
        }

        if (
            nombre === 'border-style' || nombre === 'border-left-style' ||
            nombre === 'border-right-style' || nombre === 'border-top-style' ||
            nombre === 'border-bottom-style'
        ) {
            if (!(valor === 'DOTTED' || valor === 'LINE' || valor === 'DOUBLE' || valor === 'SOLID')) {
                this.agregarError(`Valor inválido para ${nombre}: ${String(valor)}`);
            }
            return;
        }

        // color
        if (
            nombre === 'color' || nombre === 'background-color' ||
            nombre === 'border-color' || nombre === 'border-left-color' ||
            nombre === 'border-right-color' || nombre === 'border-top-color' ||
            nombre === 'border-bottom-color'
        ) {
            this.validarColor(valor, nombre);
            return;
        }

        // shorthand border
        if (
            nombre === 'border' || nombre === 'border-left' ||
            nombre === 'border-right' || nombre === 'border-top' ||
            nombre === 'border-bottom'
        ) {
            this.validarBordeShorthand(valor, variableFor, nombre);
            return;
        }

        // medida / numero
        if (
            nombre === 'height' || nombre === 'width' ||
            nombre === 'min-width' || nombre === 'max-width' ||
            nombre === 'min-height' || nombre === 'max-height' ||
            nombre === 'padding' || nombre === 'padding-left' || nombre === 'padding-right' ||
            nombre === 'padding-top' || nombre === 'padding-bottom' ||
            nombre === 'margin' || nombre === 'margin-left' || nombre === 'margin-right' ||
            nombre === 'margin-top' || nombre === 'margin-bottom'
        ) {
            this.validarMedida(valor, variableFor, nombre);
            return;
        }

        if (
            nombre === 'text-size' || nombre === 'border-radius' ||
            nombre === 'border-width' || nombre === 'border-left-width' ||
            nombre === 'border-right-width' || nombre === 'border-top-width' ||
            nombre === 'border-bottom-width'
        ) {
            this.validarNumeroOExpr(valor, variableFor, nombre);
            return;
        }

        this.agregarError(`Propiedad no soportada: ${nombre}`);
    }

    validarMedida(valor, variableFor, contexto) {
        if (valor && typeof valor === 'object' && valor.tipo === 'porcentaje') {
            if (typeof valor.valor !== 'number' || !isFinite(valor.valor)) {
                this.agregarError(`Porcentaje inválido en ${contexto}`);
                return;
            }
            if (valor.valor < 0 || valor.valor > 100) {
                this.agregarError(`Porcentaje fuera de rango [0,100] en ${contexto}`);
            }
            return;
        }

        this.validarNumeroOExpr(valor, variableFor, contexto);
    }

    validarNumeroOExpr(valor, variableFor, contexto) {
        if (typeof valor === 'number') {
            if (!isFinite(valor)) {
                this.agregarError(`Número inválido en ${contexto}`);
                return;
            }
            if (valor < 0) {
                this.agregarError(`No se permiten negativos en ${contexto}`);
            }
            return;
        }

        if (typeof valor === 'string' && valor.charAt(0) === '$') {
            if (!variableFor) {
                this.agregarError(`Variable fuera de for en ${contexto}`);
                return;
            }
            if (valor !== variableFor) {
                this.agregarError(`Variable no permitida en ${contexto}: ${valor}`);
            }
            return;
        }

        if (valor && typeof valor === 'object' && valor.op) {
            this.validarExprConVariable(valor, variableFor, contexto);
            return;
        }

        this.agregarError(`Valor inválido en ${contexto}`);
    }

    validarExprConVariable(expr, variablePermitida, contexto) {
        if (!variablePermitida) {
            this.agregarError(`No se permiten expresiones fuera de for en ${contexto}`);
            return;
        }

        if (typeof expr === 'number') return;

        if (typeof expr === 'string' && expr.charAt(0) === '$') {
            if (expr !== variablePermitida) {
                this.agregarError(`Variable no permitida en expresión de ${contexto}: ${expr}`);
            }
            return;
        }

        if (!expr || typeof expr !== 'object' || !expr.op) {
            this.agregarError(`Expresión inválida en ${contexto}`);
            return;
        }

        if (!(expr.op === '+' || expr.op === '-' || expr.op === '*' || expr.op === '/')) {
            this.agregarError(`Operador inválido en ${contexto}`);
            return;
        }

        this.validarExprConVariable(expr.left, variablePermitida, contexto);
        this.validarExprConVariable(expr.right, variablePermitida, contexto);

        if (expr.op === '/' && typeof expr.right === 'number' && expr.right === 0) {
            this.agregarError(`División entre cero en ${contexto}`);
        }
    }

    evaluarExprRangoSinVariables(expr, contexto) {
        if (typeof expr === 'number') {
            if (!isFinite(expr)) {
                this.agregarError(`Número inválido en ${contexto}`);
                return null;
            }
            return expr;
        }

        if (typeof expr === 'string' && expr.charAt(0) === '$') {
            this.agregarError(`No se permiten variables en ${contexto}`);
            return null;
        }

        if (!expr || typeof expr !== 'object' || !expr.op) {
            this.agregarError(`Expresión inválida en ${contexto}`);
            return null;
        }

        const left = this.evaluarExprRangoSinVariables(expr.left, contexto);
        const right = this.evaluarExprRangoSinVariables(expr.right, contexto);

        if (left === null || right === null) return null;

        if (expr.op === '+') return left + right;
        if (expr.op === '-') return left - right;
        if (expr.op === '*') return left * right;
        if (expr.op === '/') {
            if (right === 0) {
                this.agregarError(`División entre cero en ${contexto}`);
                return null;
            }
            return left / right;
        }

        this.agregarError(`Operador inválido en ${contexto}`);
        return null;
    }

    validarBordeShorthand(valor, variableFor, contexto) {
        if (!valor || typeof valor !== 'object') {
            this.agregarError(`Valor inválido para ${contexto}`);
            return;
        }

        this.validarNumeroOExpr(valor.ancho, variableFor, `${contexto}.ancho`);

        if (!(valor.estilo === 'DOTTED' || valor.estilo === 'LINE' || valor.estilo === 'DOUBLE' || valor.estilo === 'SOLID')) {
            this.agregarError(`Estilo inválido en ${contexto}`);
        }

        this.validarColor(valor.color, `${contexto}.color`);
    }

    validarColor(color, contexto) {
        if (typeof color === 'string') {
            const permitidos = {
                blue: true,
                white: true,
                red: true,
                green: true,
                violet: true,
                gray: true,
                black: true,
                lightgray: true
            };
            if (!permitidos[color]) {
                this.agregarError(`Color no permitido en ${contexto}: ${color}`);
            }
            return;
        }

        if (!color || typeof color !== 'object') {
            this.agregarError(`Color inválido en ${contexto}`);
            return;
        }

        if (color.tipo === 'hex') {
            if (!this.esHexColorValido(color.valor)) {
              this.agregarError(`Color hexadecimal inválido en ${contexto}: ${String(color.valor)}`);
            }
            return;
        }

        if (color.tipo === 'rgb') {
            if (!Array.isArray(color.valor) || color.valor.length !== 3) {
                this.agregarError(`Color RGB inválido en ${contexto}`);
                return;
            }

            for (let i = 0; i < 3; i++) {
                const c = color.valor[i];
                if (!Number.isInteger(c) || c < 0 || c > 255) {
                    this.agregarError(`Componente RGB fuera de rango [0,255] en ${contexto}`);
                    return;
                }
            }
            return;
        }

        this.agregarError(`Tipo de color no soportado en ${contexto}`);
    }
}

    export function analizarEstilos(ast) {
        const analizador = new AnalizadorSemanticoEstilos();
        return analizador.analizar(ast);
    }

    export { AnalizadorSemanticoEstilos };

    export default analizarEstilos;