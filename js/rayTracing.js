
var canvas;
var gl;
var prg;
var vertexBuffer = null;

var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var repMatrix = mat3.create();

window.onload = function() {
    canvas = document.getElementById('glcanvas');
    gl=null;

    try {
        gl = WebGLDebugUtils.makeDebugContext(canvas.getContext("webgl"));
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    }
    catch(e) {
    }
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
    }
    initProgram();
    initBuffers();
    drawScene();
};

function initProgram() {
    var fgShader = getShader(gl, "shader-fs");
    var vxShader = getShader(gl, "shader-vs");

    prg = gl.createProgram();
    gl.attachShader(prg, vxShader);
    gl.attachShader(prg, fgShader);
    gl.linkProgram(prg);

    if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(prg);

    prg.vertexPositionAttribute = gl.getAttribLocation(prg, 'aVertexPosition');
    gl.enableVertexAttribArray(prg.vertexPositionAttribute);

    prg.pMatrixUniform          = gl.getUniformLocation(prg, 'uPMatrix');
    prg.mvMatrixUniform         = gl.getUniformLocation(prg, 'uMVMatrix');
    prg.repMatrixUniform        = gl.getUniformLocation(prg, 'uRepMatrix');
    prg.alphaUniform            = gl.getUniformLocation(prg, 'uAlpha');

}

function getShader(gl, id) {
    var script = document.getElementById(id);
    if (!script) {
        return null;
    }

    var str = "";
    var k = script.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }
    var shader;
    if (script.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (script.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function initBuffers(){
    var vertices = [
        -1.0, -1.0,
        +1.0, -1.0,
        -1.0, +1.0,
        +1.0, +1.0
    ];

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

}

function drawScene(){
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    var fov = 70;
    var alpha = Math.tan(fov/2*Math.PI/180);

    mat4.identity(pMatrix);
    mat4.perspective(pMatrix, degToRad(fov),1, 1.0, 1000.0);
    mat4.translate(pMatrix,pMatrix,[0.0, 0.0, -1.0]);
    mat4.identity(mvMatrix);

    repMatrix = mat3.fromValues(2/gl.viewportWidth,0,0,0,-(2/gl.viewportHeight),0,-1,1,1);

    gl.uniform1f(prg.alphaUniform, alpha);
    gl.uniformMatrix4fv(prg.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(prg.mvMatrixUniform, false, mvMatrix);
    gl.uniformMatrix3fv(prg.repMatrixUniform,false,repMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(prg.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function degToRad(degrees) {
    return (degrees * Math.PI / 180.0);
}
