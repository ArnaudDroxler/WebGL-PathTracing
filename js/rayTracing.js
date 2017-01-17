
var canvas;
var gl;
var prg;
var vertexBuffer = null;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var repMatrix = mat3.create();
var rotY = 0;
var rotX = 0;
var dragging = false;
var sphereMoving1 = false;
var sphereMoving2 = false;
var lightMoving = false;
var oldMousePos = {x: 0, y: 0};
var alpha = 0;
var fov = 70;
var bounce = 2.0;
var spherePos1 = vec3.fromValues(0.0,-0.8,0.0);
var spherePos2 = vec3.fromValues(0.0,0.8,0.0);
var lightPos = vec3.fromValues(0.2,0.2,0.2);

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

    repMatrix = mat3.fromValues(2/gl.viewportWidth,0,0,0,-(2/gl.viewportHeight),0,-1,1,1);
    alpha = Math.tan(fov/2*Math.PI/180);
    canvas.onmousedown = handleMouseDown;
    canvas.onmouseup = handleMouseUp;

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
    prg.spherePos1Uniform       = gl.getUniformLocation(prg, 'uSpherePos1');
    prg.spherePos2Uniform       = gl.getUniformLocation(prg, 'uSpherePos2');
    prg.lightPosUniform         = gl.getUniformLocation(prg, 'uLightPos');
    prg.bounceUniform           = gl.getUniformLocation(prg, 'uBounce');

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
    console.log("Draw Call");
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    mat4.identity(pMatrix);
    mat4.identity(mvMatrix);
    mat4.perspective(pMatrix, degToRad(fov),1, 1.0, 1000.0);
    mat4.translate(pMatrix,pMatrix,[0.0, 0.0, -1.0]);
    mat4.rotate(mvMatrix, mvMatrix,degToRad(rotX), [1, 0, 0]);
    mat4.rotate(mvMatrix, mvMatrix,degToRad(rotY), [0, 1, 0]);


    var pos = vec3.create();
    vec3.multiply(pos,spherePos1,[-1.0,-1.0,-1.0]);
    gl.uniform3fv(prg.spherePos1Uniform,pos);
    vec3.multiply(pos,spherePos2,[-1.0,-1.0,-1.0]);
    gl.uniform3fv(prg.spherePos2Uniform,pos);
    vec3.multiply(pos,lightPos,[1.0,-1.0,-1.0]);
    gl.uniform3fv(prg.lightPosUniform,pos);
    gl.uniform1f(prg.alphaUniform, alpha);
    gl.uniformMatrix4fv(prg.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(prg.mvMatrixUniform, false, mvMatrix);
    gl.uniformMatrix3fv(prg.repMatrixUniform,false,repMatrix);
    gl.uniform1f(prg.bounceUniform,bounce);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(prg.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function degToRad(degrees) {
    return (degrees * Math.PI / 180.0);
}

function intersectSphere( dir, origin, spherePosition, sphereRayon) {
    var l = vec3.fromValues(0.0,0.0,0.0);
    vec3.sub(l,origin,spherePosition);
    var b = 2.0 * vec3.dot(l, dir);
    var c = vec3.dot(l, l) - sphereRayon*sphereRayon;
    var discriminant = b*b - 4.0*c;
    if(discriminant > 0.0) {
        var t = (-b-Math.sqrt(discriminant))/(2.0);
        if(t > 0.0){
            return t;
        }
    }
    return 1000.0;
}

function selectedShepe(pos,spherePos,rayon){
    var dir = vec3.fromValues(pos.x,pos.y,1.0);
    var ori = vec3.fromValues(0.0,0.0,2.0);
    vec3.transformMat3(dir,dir,repMatrix);
    vec3.multiply(dir,dir,[alpha,alpha,-1.0]);
    vec3.normalize(dir,dir);
    vec3.transformMat4(dir,dir,mvMatrix);
    vec3.transformMat4(ori,ori,mvMatrix);
    var tsphere = intersectSphere(dir, ori, spherePos,rayon);
    return tsphere;
}
function handleMouseMove(event) {
    var mousePos = {
        x: event.clientX,
        y: event.clientY
    };

    dX = mousePos.x - oldMousePos.x;
    dY = mousePos.y - oldMousePos.y;

    if (dragging){
        rotY += dX;
        rotX += dY;
    }
    if(sphereMoving1){
        var posY = dX > 0 ? -0.01*Math.abs(dX)*0.5 : dX < 0 ? 0.01*Math.abs(dX)*0.5 : 0;
        var posX = dY > 0 ? -0.01*Math.abs(dY)*0.5 : dY < 0 ? 0.01*Math.abs(dY)*0.5 : 0;

        var offset = vec3.fromValues(posY,posX,0.0);
        vec3.transformMat4(offset,offset,mvMatrix);
        vec3.transformMat3(offset,offset,[1,0,0,0,1,0,0,0,-1]);
        vec3.add(spherePos1,spherePos1,offset);
    }
    if(sphereMoving2){
        var posY = dX > 0 ? -0.01*Math.abs(dX)*0.5 : dX < 0 ? 0.01*Math.abs(dX)*0.5 : 0;
        var posX = dY > 0 ? -0.01*Math.abs(dY)*0.5 : dY < 0 ? 0.01*Math.abs(dY)*0.5 : 0;

        var offset = vec3.fromValues(posY,posX,0.0);
        vec3.transformMat4(offset,offset,mvMatrix);
        vec3.transformMat3(offset,offset,[1,0,0,0,1,0,0,0,-1]);
        vec3.add(spherePos2,spherePos2,offset);
    }
    if(lightMoving){
        var posY = dX > 0 ? -0.01*Math.abs(dX)*0.5 : dX < 0 ? 0.01*Math.abs(dX)*0.5 : 0;
        var posX = dY > 0 ? -0.01*Math.abs(dY)*0.5 : dY < 0 ? 0.01*Math.abs(dY)*0.5 : 0;

        var offset = vec3.fromValues(posY,posX,0.0);
        vec3.transformMat4(offset,offset,mvMatrix);
        vec3.transformMat3(offset,offset,[-1,0,0,0,1,0,0,0,-1]);
        vec3.add(lightPos,lightPos,offset);
    }
    drawScene();
    oldMousePos = mousePos;
}

function getMousePos(event) {
    var rect = canvas.getBoundingClientRect();
    return {x: parseInt((event.clientX - rect.left)), y: parseInt((event.clientY - rect.top))};
}

function handleMouseDown(event) {
    var pos = getMousePos(event);
    tsphere1 = selectedShepe(pos,spherePos1,0.25);
    tsphere2 = selectedShepe(pos,spherePos2,0.25);
    tlight = selectedShepe(pos,lightPos,0.05);

    var t = 100.0;
    if(tsphere1 < t){
        t = tsphere1;
    }
    if(tsphere2 < t){
        t = tsphere2;
    }
    if(tlight < t){
        t = tlight;
    }
    if(t == 100.0){
        dragging = true;
    }
    if (t == tsphere1){
        sphereMoving1 = true;
    }
    if (t == tsphere2){
        sphereMoving2 = true;
    }
    if (t == tlight){
        lightMoving = true;
    }

    oldMousePos.x = event.clientX;
    oldMousePos.y = event.clientY;
    canvas.onmousemove = handleMouseMove;
}
function handleMouseUp(event){
    dragging = false;
    sphereMoving1 = false;
    sphereMoving2 = false;
    lightMoving = false;
    canvas.onmousemove = null;
}

function bounceValue(value){
    document.getElementById("bounceDisplay").innerHTML = value;
    bounce = value;
    bounce++;
    drawScene();
}
