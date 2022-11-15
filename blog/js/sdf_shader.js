'use strict';

let gl = null;
let canvas = null;
let res_uniform = null;
let time_uniform = null;
let sampler_uniform = null;

function compileShader(id, type)
{
    let code = document.getElementById(id).firstChild.nodeValue;
    let shader = gl.createShader(type);

    gl.shaderSource(shader, code);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
        console.log("Error compiling", id);
        console.log(gl.getShaderInfoLog(shader));
    }

    return shader;
}

function makeShader(info)
{
    let program = gl.createProgram();
    info.forEach(function(desc) {
        let shader = compileShader(desc.id, desc.type);
        if (shader) {
            gl.attachShader(program, shader);
        }
    });

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    {
        console.log("Error linking");
        console.log(gl.getProgramInfoLog(program));
    }

    return program;
}

function setCanvasHiDPI(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const dpi = window.devicePixelRatio;
    canvas.width = canvas.width * dpi;
    canvas.height = canvas.height * dpi;
    canvas.style.width = w + "px"
    canvas.style.height = h + "px";
}

function setup(shouldAnimate)
{
    canvas = document.getElementById('glcanvas');
    setCanvasHiDPI(canvas);
    gl = glcanvas.getContext('webgl', {
        antialias: true
    });

    const shaders = [
        { type: gl.VERTEX_SHADER, id: 'vertex-shader' },
        { type: gl.FRAGMENT_SHADER, id: 'fragment-shader' }
    ];

    let shader = makeShader(shaders);

    const vertex_array = new Float32Array([
        -1.0,  1.0, 
         1.0,  1.0, 
         1.0, -1.0,

        -1.0,  1.0, 
         1.0, -1.0, 
        -1.0, -1.0
    ]);

    gl.useProgram(shader);
    let vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    let attrib = gl.getAttribLocation(shader, 'position');
    gl.enableVertexAttribArray(attrib);
    gl.vertexAttribPointer(attrib, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, vertex_array, gl.STATIC_DRAW);

    time_uniform = gl.getUniformLocation(shader, 'uTime');
    res_uniform = gl.getUniformLocation(shader, 'res');

    gl.clearColor(0, 0, 0, 1);

    startAnimation(shouldAnimate);
}

function startAnimation(shouldAnimate) {
    function animate(timestamp)
    {
        gl.viewport(0, 0, glcanvas.width, glcanvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform1f(time_uniform, timestamp/1000);
        gl.uniform2f(res_uniform, canvas.width, canvas.height);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        if (shouldAnimate) {
            window.requestAnimationFrame(animate); 
        }
    }

    animate(0);
}
