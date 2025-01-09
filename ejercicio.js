// <============================================ EJERCICIOS ============================================>
// a) Implementar la función:
//
//      GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
//
//    Si la implementación es correcta, podrán hacer rotar la caja correctamente. IMPORTANTE: No
//    es recomendable avanzar con los ejercicios b) y c) si este no funciona correctamente. 
//
// b) Implementar los métodos:
//
//      setMesh( vertPos, texCoords )
//      swapYZ( swap )
//      draw( trans )
//
//    Si la implementación es correcta, podrán visualizar el objeto 3D que hayan cargado, asi como también intercambiar 
//    sus coordenadas yz. Para reenderizar cada fragmento, en vez de un color fijo, pueden retornar: 
//
//      gl_FragColor = vec4(1,0,gl_FragCoord.z*gl_FragCoord.z,1);
//
//    que pintará cada fragmento con un color proporcional a la distancia entre la cámara y el fragmento.
//    IMPORTANTE: No es recomendable avanzar con el ejercicio c) si este no funciona correctamente. 
//
// c) Implementar los métodos:
//
//      setTexture( img )
//      showTexture( show )
//
//    Si la implementación es correcta, podrán visualizar el objeto 3D que hayan cargado y su textura.
//
// Notar que los shaders deberán ser modificados entre el ejercicio b) y el c) para incorporar las texturas.  
// <=====================================================================================================>


// Esta función recibe la matriz de proyección (ya calculada), una traslación y dos ángulos de rotación
// (en radianes). Cada una de las rotaciones se aplican sobre el eje x e y, respectivamente. La función
// debe retornar la combinación de las transformaciones 3D (rotación, traslación y proyección) en una matriz
// de 4x4, representada por un arreglo en formato column-major. El parámetro projectionMatrix también es 
// una matriz de 4x4 alamcenada como un arreglo en orden column-major. En el archivo project4.html ya está
// implementada la función MatrixMult, pueden reutilizarla. 

function GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
{
	var yaw = [
		Math.cos(rotationY), 0, -Math.sin(rotationY), 0,
		0,                   1,  0,                    0,
		Math.sin(rotationY), 0,  Math.cos(rotationY), 0,
		0,                   0,  0,                    1
	];

	var pitch = [
		1, 0, 0, 0,
		0,  Math.cos(rotationX), Math.sin(rotationX), 0,
		0, -Math.sin(rotationX), Math.cos(rotationX), 0,
		0, 0, 0, 1
	];

	var r = MatrixMult(yaw, pitch);

	// Matriz de traslación
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];

	let mvp = MatrixMult( projectionMatrix, trans );
	mvp = MatrixMult(mvp, r);

	return mvp;
}

class MeshDrawer
{
	// El constructor es donde nos encargamos de realizar las inicializaciones necesarias. 
	constructor()
	{
		// Inicializacion
		this.vertbuffer = gl.createBuffer();

		this.textureCoordsBuffer = gl.createBuffer();

		this.texture = gl.createTexture();

		// 1. Compilamos el programa de shaders
		// vertex shader
		const vs = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vs, meshVS);
		gl.compileShader(vs);

		if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)){ 
			alert(gl.getShaderInfoLog(vs)); 
			gl.deleteShader(vs);
		}

		// fragment shader
		const fs = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fs, meshFS);
		gl.compileShader(fs);

		if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)){
			alert(gl.getShaderInfoLog(fs));
			gl.deleteShader(fs);
		}

		// link de los shaders al programa
		this.prog = gl.createProgram();
		gl.attachShader(this.prog, vs);
		gl.attachShader(this.prog, fs);
		gl.linkProgram(this.prog);

		if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)){
			alert(gl.getProgramInfoLog(this.prog));
		}
		
		gl.useProgram(this.prog);

		// 2. Obtenemos los IDs de las variables uniformes en los shaders
		this.mvpLocation = gl.getUniformLocation(this.prog, "mvp");

		this.swapLocation = gl.getUniformLocation(this.prog, "swapYZ");
		
		this.textureSamplerLocation = gl.getUniformLocation(this.prog, 'uSampler');

		this.useTextureLocation = gl.getUniformLocation(this.prog, 'useTexture');

		// 3. Obtenemos los IDs de los atributos de los vértices en los shaders

		this.posLocation = gl.getAttribLocation(this.prog, 'pos');
	
		this.textureCoordsLocation = gl.getAttribLocation(this.prog, 'textureCoord');

		// Otros
		gl.uniform1i(this.useTextureLocation, true);
	}
	
	// Esta función se llama cada vez que el usuario carga un nuevo archivo OBJ.
	// En los argumentos de esta función llegan un areglo con las posiciones 3D de los vértices
	// y un arreglo 2D con las coordenadas de textura. Todos los items en estos arreglos son del tipo float. 
	// Los vértices se componen de a tres elementos consecutivos en el arreglo vertexPos [x0,y0,z0,x1,y1,z1,..,xn,yn,zn]
	// De manera similar, las cooredenadas de textura se componen de a 2 elementos consecutivos y se 
	// asocian a cada vértice en orden. 
	setMesh( newVertPos, texCoords )
	{
		this.numTriangles = newVertPos.length / 3;
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(newVertPos), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordsBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	}
	
	// Esta función se llama cada vez que el usuario cambia el estado del checkbox 'Intercambiar Y-Z'
	// El argumento es un boleano que indica si el checkbox está tildado
	swapYZ( swap )
	{
		gl.useProgram(this.prog);
		gl.uniform1i(this.swapLocation, swap);
	}
	
	// Esta función se llama para dibujar la malla de triángulos
	// El argumento es la matriz de transformación, la misma matriz que retorna GetModelViewProjection
	draw( trans )
	{
		// 1. Seleccionamos el shader
		gl.useProgram(this.prog);
	
		// 2. Setear matriz de transformacion
		gl.uniformMatrix4fv(this.mvpLocation, false, trans);
		
		// 3. Bindeamos los buffers
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);

		gl.vertexAttribPointer(this.posLocation, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.posLocation);
		
		// Binding de textCoords
		gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordsBuffer);
		
		gl.vertexAttribPointer(this.textureCoordsLocation, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.textureCoordsLocation);
		
		// 4. Renderizamos
		gl.drawArrays( gl.TRIANGLES, 0, this.numTriangles);
	}
	
	// Esta función se llama para setear una textura sobre la malla
	// El argumento es un componente <img> de html que contiene la textura. 
	setTexture( img )
	{
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
	
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}
	
	// Esta función se llama cada vez que el usuario cambia el estado del checkbox 'Mostrar textura'
	// El argumento es un boleano que indica si el checkbox está tildado
	showTexture( show )
	{
		gl.useProgram(this.prog);
		gl.uniform1i(this.useTextureLocation, show);
	}
}

// Vertex Shader
// Si declaras las variables pero no las usas es como que no las declaraste y va a tirar error. Siempre va punto y coma al finalizar la sentencia. 
// Las constantes en punto flotante necesitan ser expresadas como x.y, incluso si son enteros: ejemplo, para 4 escribimos 4.0
var meshVS = `
	precision mediump float;
		
	attribute vec3 pos;
	attribute vec2 textureCoord;
	uniform mat4 mvp;
	uniform bool swapYZ;

	varying highp vec2 vTextureCoord;

	void main()
	{
		vTextureCoord = textureCoord;
		if (swapYZ) {
			gl_Position = mvp * vec4(pos.x,pos.z,pos.y,1);
		} else {
			gl_Position = mvp * vec4(pos.x,pos.y,pos.z,1);
		}
	}
`;

// Fragment Shader
var meshFS = `
	varying highp vec2 vTextureCoord;	
	uniform sampler2D uSampler;
	uniform bool useTexture;

	void main(void) {
		if (useTexture) {
			gl_FragColor = texture2D(uSampler, vTextureCoord);
		} else {
			gl_FragColor = vec4(1,0,gl_FragCoord.z*gl_FragCoord.z,1);
		}
	}
`;
