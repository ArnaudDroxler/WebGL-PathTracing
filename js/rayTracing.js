
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
    //Recuperation du contexte WebGL
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

    //Calcul de la matrix qui tranforme la position des pixels en positon dans le repert camera
    repMatrix = mat3.fromValues(2/gl.viewportWidth,0,0,0,-(2/gl.viewportHeight),0,-1,1,1);
    alpha = Math.tan(fov/2*Math.PI/180);

    mat4.identity(pMatrix);
    mat4.perspective(pMatrix, degToRad(fov),1, 1.0, 1000.0);
    mat4.translate(pMatrix,pMatrix,[0.0, 0.0, -1.0]);

    //Declaration des fonction associer au event du canvas
    canvas.onmousedown = handleMouseDown;
    canvas.onmouseup = handleMouseUp;

    initProgram();
    initBuffers();
    drawScene();
};

function initProgram() {
    //Creation du programme
    var fgShader = getShader(gl, "shader-fs");
    var vxShader = getShader(gl, "shader-vs");

    prg = gl.createProgram();
    gl.attachShader(prg, vxShader);
    gl.attachShader(prg, fgShader);
    gl.linkProgram(prg);

    if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    //Declaration des variables a donner au shader
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
    //Creation d un quad
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

    //Nettoyage du canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    //Calcul de la mvMatrix en fonction de rotX et rotY
    mat4.identity(mvMatrix);
    mat4.rotate(mvMatrix, mvMatrix,degToRad(rotX), [1, 0, 0]);
    mat4.rotate(mvMatrix, mvMatrix,degToRad(rotY), [0, 1, 0]);


    //Passage des varibles au shader
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

    //Bind du buffer du Quad
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(prg.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    //Dessin du Quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function degToRad(degrees) {
    return (degrees * Math.PI / 180.0);
}

/*
*   permet de trouve si le rayon tire intersect avec une sphere parfaite
*   retourne la distance entre le eye et l'intersection
 */
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

/*
*   calcule la position et la direction du ray en fonction de la position du click dans le canvas
*   etourne la distance entre le eye et l'intersection
 */
function selectedSphere(pos,spherePos,rayon){
    var dir = vec3.fromValues(pos.x,pos.y,1.0);
    var ori = vec3.fromValues(0.0,0.0,2.0);
    vec3.transformMat3(dir,dir,repMatrix);
    vec3.multiply(dir,dir,[alpha,alpha,-1.0]);
    vec3.normalize(dir,dir);
    vec3.transformMat4(dir,dir,mvMatrix);
    vec3.transformMat4(ori,ori,mvMatrix);
    return intersectSphere(dir, ori, spherePos,rayon);

}
function handleMouseMove(event) {
    var mousePos = {
        x: event.clientX,
        y: event.clientY
    };

    //calcule de difference de position entre la postion de la souris actuel et precedente
    dX = mousePos.x - oldMousePos.x;
    dY = mousePos.y - oldMousePos.y;

    //Traitement en fonction dea flags de mouvement
    if (dragging){
        rotY += dX;
        rotX += dY;
    }
    //Repetition de code :(
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
    //Element ayant bouge, on redessine la scene
    drawScene();
    oldMousePos = mousePos;
}

/*
    Calcul de la position du click dans le canvas
 */
function getMousePos(event) {
    var rect = canvas.getBoundingClientRect();
    return {x: parseInt((event.clientX - rect.left)), y: parseInt((event.clientY - rect.top))};
}

/*
    Appel au click de la souris
 */
function handleMouseDown(event) {
    var pos = getMousePos(event);

    //Calcle de la distance entre yeux et la sphere (si pas intersetion retourne 1000.0 )
    tsphere1 = selectedSphere(pos,spherePos1,0.25);
    tsphere2 = selectedSphere(pos,spherePos2,0.25);
    tlight = selectedSphere(pos,lightPos,0.05);

    //On test quel sphere interecter est la plus proche
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

    //En fonction de la sphere touche on change les flags de selection
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

    //sauvergarede de la positon courante
    oldMousePos.x = event.clientX;
    oldMousePos.y = event.clientY;

    //active l event mouseMove
    canvas.onmousemove = handleMouseMove;
}

/*
 Appele au relachement du click de la souris

 */
function handleMouseUp(event){
    //reinitialisation des flags de selection
    dragging = false;
    sphereMoving1 = false;
    sphereMoving2 = false;
    lightMoving = false;
    canvas.onmousemove = null;
}

//realise l update de la bar
function bounceValue(value){
    document.getElementById("bounceDisplay").innerHTML = value;
    bounce = value;
    bounce++;
    drawScene();
}
