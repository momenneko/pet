/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.petMotion = function () {

	var scope = this; //全部の情報を入れるところっぽい

	//console.log(scope);

	this.scale = 1; //大きさ
	this.animationFPS = 3; //FPS
	console.log(this);
	this.root = new THREE.Object3D(); //?? 座標を動かすならこいつ
	//console.log(scope.root);

	this.meshBody = null; //メッシュ

	this.skinsBody = []; //テクスチャ

	this.activeAnimation = null; //現在のアニメーション

	this.onLoadComplete = function () {}; //お前は何してんだ、空の関数……?

	this.loadCounter = 0; //お前は何をカウントしてるんだ

	this.loadParts = function ( config ) {

		this.loadCounter = config.skins.length + 1;
		//console.log(config.skins.length + 1);

		// SKINS

		this.skinsBody = loadTextures( config.baseUrl, config.skins ); //モデルのテクスチャ config.baseUrl="models/bear/"(現時点)

		// BODY

		//geo.animationsにアニメーションが名前ごとに入ってる	

		var loader = new THREE.JSONLoader(true);

		loader.load( config.baseUrl + config.body, function( geo ) {

			geo.computeBoundingBox(); //ちょっと何でバウンディングボックスつくんのかわかんない
			//scope.root.position.y = - scope.scale * geo.boundingBox.min.y; 

			var mesh = createPart( geo, scope.skinsBody[ 0 ] ); //メッシュ作ってる
			mesh.scale.set( scope.scale, scope.scale, scope.scale ); //メッシュの大きさ

			scope.root.add( mesh );

			scope.meshBody = mesh;
			scope.activeAnimation = geo.firstAnimation; //jsonデータの1つ目のモーションがデフォルトになる

			checkLoadingComplete(); //だから何してんの? これがないとGUIがでてこない……?

			//console.log(geo);

		} );

	};

	this.setPlaybackRate = function ( rate ) {

		if ( this.meshBody ) this.meshBody.duration = this.meshBody.baseDuration / rate;

	};

	this.setSkin = function( index ) { //テクスチャ格納

		if ( this.meshBody ) {

			this.meshBody.material.map = this.skinsBody[ index ];

		}

	};

	this.setAnimation = function ( animationName ) { //動きを！！！！！変えてるのは！！！！！お前か！！！！！

		if ( this.meshBody ) {

			this.meshBody.playAnimation( animationName, this.animationFPS );
			this.meshBody.baseDuration = this.meshBody.duration;

		}

		this.activeAnimation = animationName; //現在のモーションを選択されたやつに変えてる?

	};

	this.update = function ( delta ) {

		if ( this.meshBody ) {

			this.meshBody.updateAnimation( 1000 * delta ); //アニメーション更新

		}

	};

	function loadTextures( baseUrl, textureUrls ) { //テクスチャ読み込み

		var mapping = THREE.UVMapping;
		var textures = [];

		for ( var i = 0; i < textureUrls.length; i ++ ) {

			textures[ i ] = THREE.ImageUtils.loadTexture( baseUrl + textureUrls[ i ], mapping, checkLoadingComplete );
			textures[ i ].name = textureUrls[ i ];

		}

		return textures;

	};

	function createPart( geometry, skinMap ) { //メッシュ関係

		geometry.computeMorphNormals();

		//var whiteMap = THREE.ImageUtils.generateDataTexture( 1, 1, new THREE.Color( 0xffffff ) );

		var materialTexture = new THREE.MeshLambertMaterial( { color: 0x606060, map: skinMap, morphTargets: true } ); //テクスチャはっつけてる
		materialTexture.wrapAround = true;

		//

		var mesh = new THREE.MorphAnimMesh( geometry, materialTexture ); //モデル読み込み
		//mesh.rotation.y = -Math.PI / 2;

		mesh.castShadow = true;
		//mesh.receiveShadow = true;

		//

		mesh.materialTexture = materialTexture;

		//

		mesh.parseAnimations(); //アニメーション読み込んでる！！！！！ここで動き毎に分割されてる！！！！！

		mesh.playAnimation( geometry.firstAnimation, scope.animationFPS ); //ぷれいあにめーしょん
		mesh.baseDuration = mesh.duration;

		return mesh;

	};

	function checkLoadingComplete() { //最後まで何してるかわからなかった

		scope.loadCounter -= 1;

		if ( scope.loadCounter === 0 ) scope.onLoadComplete();

	};

};