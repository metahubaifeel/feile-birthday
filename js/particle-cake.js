/**
 * 高密度粒子生日蛋糕 - 相机手势控制版
 * 小粒子、高密度、清晰蛋糕轮廓
 * 手势控制相机旋转和远近
 */

class ParticleCakeSystem {
    constructor() {
        this.container = document.getElementById('cake-container');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.particleCount = 8000;

        // 相机状态
        this.cameraAngle = 0;      // 水平旋转角度
        this.cameraHeight = 5;     // 垂直高度
        this.cameraDistance = 25;  // 距离蛋糕中心的距离
        this.minDistance = 12;     // 最小距离（防止穿入蛋糕）
        this.maxDistance = 50;     // 最大距离

        // 目标值（用于平滑插值）
        this.targetAngle = 0;
        this.targetHeight = 5;
        this.targetDistance = 25;

        // 粒子数据
        this.particleData = [];
        this.time = 0;

        // 爆炸状态 (0 = 完全聚合, 1 = 完全散开)
        this.explosionFactor = 0;
        this.targetExplosionFactor = 0;
        this.explosionSpeed = 0.05;

        // 配色方案（西瓜奶皮子）
        this.colors = {
            cakeBase: new THREE.Color(0xfcea92),    // 奶黄蛋糕胚
            cream: new THREE.Color(0xffffff),        // 白色奶油
            frosting: new THREE.Color(0xff69b4),     // 粉色糖霜
            candle: new THREE.Color(0xffaa00),       // 橙黄蜡烛
            cherry: new THREE.Color(0xff3333),       // 红色樱桃
            ringInner: new THREE.Color(0xffb6c1),    // 粉色内环
            ringOuter: new THREE.Color(0xc8e28a)     // 淡黄绿外环
        };

        this.init();
    }

    init() {
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = null;

        // 创建相机
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.updateCameraPosition();

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);

        // 添加灯光
        this.setupLights();

        // 创建粒子系统
        this.createParticles();

        // 开始渲染
        this.animate();

        // 窗口调整
        window.addEventListener('resize', () => this.onResize());
    }

    setupLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // 主光源（暖色）
        const mainLight = new THREE.PointLight(0xfff0e0, 1.2, 100);
        mainLight.position.set(10, 15, 10);
        this.scene.add(mainLight);

        // 补光（粉色）
        const fillLight = new THREE.PointLight(0xffd1dc, 0.6, 80);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);

        // 底部发光
        const bottomLight = new THREE.PointLight(0xc8e28a, 0.4, 60);
        bottomLight.position.set(0, -5, 0);
        this.scene.add(bottomLight);
    }

    createParticles() {
        // 清除旧粒子
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);

        this.particleData = [];

        // 分配粒子数量给不同部分
        const cakeParticles = Math.floor(this.particleCount * 0.55);      // 蛋糕主体
        const ringInnerParticles = Math.floor(this.particleCount * 0.20); // 内环装饰
        const ringOuterParticles = Math.floor(this.particleCount * 0.20); // 外环装饰
        const ambientParticles = this.particleCount - cakeParticles - ringInnerParticles - ringOuterParticles;

        let index = 0;

        // 1. 蛋糕主体粒子
        for (let i = 0; i < cakeParticles; i++) {
            const pos = this.getCakeParticlePosition(i, cakeParticles);
            const { color, size } = this.getCakeParticleStyle(pos);

            positions[index * 3] = pos.x;
            positions[index * 3 + 1] = pos.y;
            positions[index * 3 + 2] = pos.z;

            colors[index * 3] = color.r;
            colors[index * 3 + 1] = color.g;
            colors[index * 3 + 2] = color.b;

            sizes[index] = size;

            // 计算散开位置（随机方向，距离中心 15-40 单位）
            const explodeDir = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ).normalize();
            const explodeDist = 15 + Math.random() * 25;
            const explodedPos = pos.clone().add(explodeDir.multiplyScalar(explodeDist));

            this.particleData.push({
                basePos: pos.clone(),
                currentPos: pos.clone(),
                explodedPos: explodedPos,
                color: color.clone(),
                size: size,
                type: 'cake',
                phase: Math.random() * Math.PI * 2,
                floatSpeed: 0.5 + Math.random() * 0.5
            });

            index++;
        }

        // 2. 内环装饰（粉色）
        for (let i = 0; i < ringInnerParticles; i++) {
            const t = i / ringInnerParticles;
            const angle = t * Math.PI * 2;
            const radius = 9 + Math.random() * 1.5;
            const y = 2 + Math.sin(t * 10) * 2 + (Math.random() - 0.5);

            positions[index * 3] = Math.cos(angle) * radius;
            positions[index * 3 + 1] = y;
            positions[index * 3 + 2] = Math.sin(angle) * radius;

            const variation = 0.9 + Math.random() * 0.2;
            colors[index * 3] = this.colors.ringInner.r * variation;
            colors[index * 3 + 1] = this.colors.ringInner.g * variation;
            colors[index * 3 + 2] = this.colors.ringInner.b * variation;

            sizes[index] = 0.12 + Math.random() * 0.08;

            const basePos = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
            // 散开位置
            const explodeDir = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2 + 0.5, // 略微向上
                (Math.random() - 0.5) * 2
            ).normalize();
            const explodedPos = basePos.clone().add(explodeDir.multiplyScalar(10 + Math.random() * 20));

            this.particleData.push({
                basePos: basePos,
                currentPos: basePos.clone(),
                explodedPos: explodedPos,
                color: this.colors.ringInner.clone(),
                size: sizes[index],
                type: 'ringInner',
                phase: t * Math.PI * 2,
                floatSpeed: 1 + Math.random() * 0.5
            });

            index++;
        }

        // 3. 外环装饰（淡黄绿）
        for (let i = 0; i < ringOuterParticles; i++) {
            const t = i / ringOuterParticles;
            const angle = t * Math.PI * 2 + Math.PI / 4; // 错开内环
            const radius = 12 + Math.random() * 2;
            const y = 3 + Math.cos(t * 8) * 1.5 + (Math.random() - 0.5);

            positions[index * 3] = Math.cos(angle) * radius;
            positions[index * 3 + 1] = y;
            positions[index * 3 + 2] = Math.sin(angle) * radius;

            const variation = 0.85 + Math.random() * 0.3;
            colors[index * 3] = this.colors.ringOuter.r * variation;
            colors[index * 3 + 1] = this.colors.ringOuter.g * variation;
            colors[index * 3 + 2] = this.colors.ringOuter.b * variation;

            sizes[index] = 0.1 + Math.random() * 0.06;

            const basePos = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
            // 散开位置
            const explodeDir = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2 + 0.3,
                (Math.random() - 0.5) * 2
            ).normalize();
            const explodedPos = basePos.clone().add(explodeDir.multiplyScalar(12 + Math.random() * 25));

            this.particleData.push({
                basePos: basePos,
                currentPos: basePos.clone(),
                explodedPos: explodedPos,
                color: this.colors.ringOuter.clone(),
                size: sizes[index],
                type: 'ringOuter',
                phase: t * Math.PI * 2 + Math.PI,
                floatSpeed: 0.8 + Math.random() * 0.4
            });

            index++;
        }

        // 4. 环境漂浮粒子
        for (let i = 0; i < ambientParticles; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 15 + Math.random() * 15;

            positions[index * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[index * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[index * 3 + 2] = r * Math.cos(phi);

            const colorChoice = Math.random();
            let color;
            if (colorChoice < 0.33) color = this.colors.ringInner;
            else if (colorChoice < 0.66) color = this.colors.ringOuter;
            else color = this.colors.cakeBase;

            const variation = 0.8 + Math.random() * 0.4;
            colors[index * 3] = color.r * variation;
            colors[index * 3 + 1] = color.g * variation;
            colors[index * 3 + 2] = color.b * variation;

            sizes[index] = 0.06 + Math.random() * 0.06;

            const basePos = new THREE.Vector3(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
            // 散开位置 - 环境粒子散得更远
            const explodeDir = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ).normalize();
            const explodedPos = basePos.clone().add(explodeDir.multiplyScalar(20 + Math.random() * 30));

            this.particleData.push({
                basePos: basePos,
                currentPos: basePos.clone(),
                explodedPos: explodedPos,
                color: color.clone(),
                size: sizes[index],
                type: 'ambient',
                phase: Math.random() * Math.PI * 2,
                floatSpeed: 0.3 + Math.random() * 0.3
            });

            index++;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // 创建发光粒子材质
        const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: true
        });

        // 创建圆形粒子纹理
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(0.6, 'rgba(255,255,255,0.3)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        material.map = new THREE.CanvasTexture(canvas);

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    getCakeParticlePosition(index, total) {
        // 蛋糕结构：三层 + 奶油夹层 + 蜡烛 + 水果
        const t = index / total;

        // 确定粒子属于哪个部分
        let part;
        if (t < 0.35) part = 'base';      // 底层蛋糕胚
        else if (t < 0.45) part = 'cream1'; // 第一层奶油
        else if (t < 0.65) part = 'middle'; // 中层蛋糕
        else if (t < 0.72) part = 'cream2'; // 第二层奶油
        else if (t < 0.82) part = 'top';    // 顶层蛋糕
        else if (t < 0.88) part = 'frosting'; // 顶部糖霜
        else if (t < 0.95) part = 'candle'; // 蜡烛
        else part = 'cherry';                // 樱桃装饰

        let x, y, z, radius, height, yOffset;

        switch(part) {
            case 'base':
                radius = 5;
                height = 2.5;
                yOffset = 0;
                break;
            case 'cream1':
                radius = 4.8;
                height = 0.4;
                yOffset = 2.5;
                break;
            case 'middle':
                radius = 4;
                height = 2;
                yOffset = 2.9;
                break;
            case 'cream2':
                radius = 3.8;
                height = 0.4;
                yOffset = 4.9;
                break;
            case 'top':
                radius = 3;
                height = 1.8;
                yOffset = 5.3;
                break;
            case 'frosting':
                radius = 2.8;
                height = 0.5;
                yOffset = 7.1;
                break;
            case 'candle':
                // 4根蜡烛位置
                const candleIndex = Math.floor((t - 0.82) / 0.03);
                const candlePositions = [
                    { x: 0, z: 0 },
                    { x: 1.2, z: -0.8 },
                    { x: -1.2, z: -0.8 },
                    { x: 0, z: 1.2 }
                ];
                const pos = candlePositions[candleIndex] || candlePositions[0];
                return new THREE.Vector3(
                    pos.x + (Math.random() - 0.5) * 0.15,
                    7.5 + Math.random() * 2.5,
                    pos.z + (Math.random() - 0.5) * 0.15
                );
            case 'cherry':
                // 樱桃在顶部
                const cherryAngle = Math.random() * Math.PI * 2;
                const cherryR = Math.random() * 2;
                return new THREE.Vector3(
                    Math.cos(cherryAngle) * cherryR,
                    7.3 + Math.random() * 0.4,
                    Math.sin(cherryAngle) * cherryR
                );
        }

        // 圆柱内随机分布
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        x = Math.cos(angle) * r;
        z = Math.sin(angle) * r;
        y = yOffset + Math.random() * height;

        return new THREE.Vector3(x, y, z);
    }

    getCakeParticleStyle(pos) {
        let color, size;

        if (pos.y < 2.5) {
            // 底层蛋糕胚
            color = this.colors.cakeBase;
            size = 0.15 + Math.random() * 0.08;
        } else if (pos.y < 2.9) {
            // 奶油夹层1
            color = this.colors.cream;
            size = 0.12 + Math.random() * 0.06;
        } else if (pos.y < 4.9) {
            // 中层蛋糕
            color = this.colors.cakeBase;
            size = 0.14 + Math.random() * 0.07;
        } else if (pos.y < 5.3) {
            // 奶油夹层2
            color = this.colors.cream;
            size = 0.11 + Math.random() * 0.05;
        } else if (pos.y < 7.1) {
            // 顶层蛋糕
            color = this.colors.cakeBase;
            size = 0.13 + Math.random() * 0.06;
        } else if (pos.y < 7.6) {
            // 顶部糖霜
            color = this.colors.frosting;
            size = 0.16 + Math.random() * 0.08;
        } else if (pos.y < 10) {
            // 蜡烛
            color = this.colors.candle;
            size = 0.18 + Math.random() * 0.1;
        } else {
            // 樱桃
            color = this.colors.cherry;
            size = 0.2 + Math.random() * 0.1;
        }

        // 添加颜色变化
        const variation = 0.9 + Math.random() * 0.2;
        return {
            color: new THREE.Color(color.r * variation, color.g * variation, color.b * variation),
            size: size
        };
    }

    // 更新相机位置（围绕蛋糕旋转）
    updateCameraPosition() {
        const x = Math.cos(this.cameraAngle) * this.cameraDistance;
        const z = Math.sin(this.cameraAngle) * this.cameraDistance;
        this.camera.position.set(x, this.cameraHeight, z);
        this.camera.lookAt(0, 4, 0); // 看向蛋糕中心
    }

    // 手势控制接口

    /**
     * 设置相机旋转角度
     * @param {number} angle - 角度（度），正数为顺时针
     */
    setCameraRotation(angle) {
        this.targetAngle = angle * (Math.PI / 180);
    }

    /**
     * 设置相机距离
     * @param {number} distance - 距离蛋糕中心的距离
     * @param {boolean} useCurve - 是否使用曲线速度（握拳远离用）
     */
    setCameraDistance(distance, useCurve = false) {
        // 限制在最小和最大距离之间
        let target = Math.max(this.minDistance, Math.min(this.maxDistance, distance));

        if (useCurve) {
            // 速度先慢后快：使用距离差值的平方
            const currentRatio = (this.cameraDistance - this.minDistance) / (this.maxDistance - this.minDistance);
            const speedMultiplier = 0.2 + currentRatio * currentRatio * 0.8;

            // 平滑过渡，但速度逐渐加快
            const diff = target - this.cameraDistance;
            this.targetDistance = this.cameraDistance + diff * speedMultiplier;
        } else {
            // 速度先快后慢：使用距离差值的平方根
            const currentRatio = (this.cameraDistance - this.minDistance) / (this.maxDistance - this.minDistance);
            const speedMultiplier = 1 - Math.sqrt(currentRatio) * 0.5;

            const diff = target - this.cameraDistance;
            this.targetDistance = this.cameraDistance + diff * speedMultiplier;
        }
    }

    /**
     * 直接设置相机距离（用于常规平滑过渡）
     * @param {number} distance - 目标距离
     */
    setTargetDistance(distance) {
        this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, distance));
    }

    /**
     * 设置相机高度
     * @param {number} height - 高度
     */
    setCameraHeight(height) {
        this.targetHeight = Math.max(-5, Math.min(15, height));
    }

    updateParticles() {
        if (!this.particles) return;

        const positions = this.particles.geometry.attributes.position.array;
        const colors = this.particles.geometry.attributes.color.array;
        this.time += 0.016;

        // 平滑插值爆炸因子
        const diff = this.targetExplosionFactor - this.explosionFactor;
        this.explosionFactor += diff * this.explosionSpeed;

        for (let i = 0; i < this.particleCount; i++) {
            const data = this.particleData[i];

            // 计算当前位置：basePos 和 explodedPos 之间插值
            const currentPos = new THREE.Vector3();

            if (this.explosionFactor < 0.01) {
                // 完全聚合状态
                currentPos.copy(data.basePos);
            } else if (this.explosionFactor > 0.99) {
                // 完全散开状态
                currentPos.copy(data.explodedPos);
            } else {
                // 过渡状态 - 使用缓动函数
                const t = this.explosionFactor;
                const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                currentPos.lerpVectors(data.basePos, data.explodedPos, easeT);
            }

            // 散开状态下的漂浮动画
            let floatX = 0, floatY = 0, floatZ = 0;
            if (this.explosionFactor > 0.1) {
                const floatIntensity = this.explosionFactor * 0.5;
                floatY = Math.sin(this.time * data.floatSpeed + data.phase) * floatIntensity;
                floatX = Math.cos(this.time * data.floatSpeed * 0.7 + data.phase) * floatIntensity * 0.5;
                floatZ = Math.sin(this.time * data.floatSpeed * 0.5 + data.phase) * floatIntensity * 0.5;
            }

            // 装饰环绕旋转（仅在聚合状态或部分聚合时）
            let rotX = currentPos.x + floatX;
            let rotZ = currentPos.z + floatZ;

            if (data.type === 'ringInner' && this.explosionFactor < 0.5) {
                const rotationInfluence = 1 - this.explosionFactor * 2;
                const angle = this.time * 0.2 * rotationInfluence;
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                const relX = currentPos.x * cosA - currentPos.z * sinA;
                const relZ = currentPos.x * sinA + currentPos.z * cosA;
                rotX = relX + floatX;
                rotZ = relZ + floatZ;
            } else if (data.type === 'ringOuter' && this.explosionFactor < 0.5) {
                const rotationInfluence = 1 - this.explosionFactor * 2;
                const angle = -this.time * 0.15 * rotationInfluence;
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                const relX = currentPos.x * cosA - currentPos.z * sinA;
                const relZ = currentPos.x * sinA + currentPos.z * cosA;
                rotX = relX + floatX;
                rotZ = relZ + floatZ;
            }

            positions[i * 3] = rotX;
            positions[i * 3 + 1] = currentPos.y + floatY;
            positions[i * 3 + 2] = rotZ;

            // 呼吸光效（散开时减弱）
            const breatheIntensity = 1 - this.explosionFactor * 0.3;
            const breathe = 0.9 + Math.sin(this.time * 2 + data.phase) * 0.1 * breatheIntensity;
            colors[i * 3] = data.color.r * breathe;
            colors[i * 3 + 1] = data.color.g * breathe;
            colors[i * 3 + 2] = data.color.b * breathe;
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.geometry.attributes.color.needsUpdate = true;
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        // 平滑插值相机参数
        const smoothFactor = 0.08;
        this.cameraAngle += (this.targetAngle - this.cameraAngle) * smoothFactor;
        this.cameraHeight += (this.targetHeight - this.cameraHeight) * smoothFactor;
        this.cameraDistance += (this.targetDistance - this.cameraDistance) * smoothFactor;

        // 更新相机位置
        this.updateCameraPosition();

        // 更新粒子动画
        this.updateParticles();

        // 渲染
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    // 获取当前状态信息
    getStatus() {
        return {
            angle: Math.round(this.cameraAngle * 180 / Math.PI),
            distance: Math.round(this.cameraDistance),
            height: Math.round(this.cameraHeight * 10) / 10,
            explosion: Math.round(this.explosionFactor * 100) / 100
        };
    }

    // 爆炸控制接口

    /**
     * 设置爆炸因子 (0 = 完全聚合, 1 = 完全散开)
     * @param {number} factor - 爆炸因子 0-1
     */
    setExplosion(factor) {
        this.targetExplosionFactor = Math.max(0, Math.min(1, factor));
    }

    /**
     * 散开蛋糕
     */
    explode() {
        this.targetExplosionFactor = 1;
    }

    /**
     * 聚合蛋糕（成型）
     */
    assemble() {
        this.targetExplosionFactor = 0;
    }

    /**
     * 获取当前爆炸状态
     */
    isExploded() {
        return this.explosionFactor > 0.5;
    }
}

// 导出
window.ParticleCakeSystem = ParticleCakeSystem;
