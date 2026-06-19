(async () => {
    'use strict';

    /* ================================================================
       DETECÇÃO DE SUPORTE MP4 — executada ANTES de tudo
       Prioridade: MediaRecorder MP4 → WebCodecs+mp4-muxer → WebM
       ================================================================ */
    let wcMuxer = null;
    let mrMP4Mime = '';

    // Tentar carregar mp4-muxer (WebCodecs)
    if (typeof VideoEncoder !== 'undefined') {
        try {
            wcMuxer = await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/build/mp4-muxer.mjs');
            console.log('mp4-muxer carregado via WebCodecs');
        } catch (e) {
            console.warn('mp4-muxer não disponível:', e.message);
        }
    }

    // Verificar MediaRecorder com mime type MP4
    if (typeof MediaRecorder !== 'undefined') {
        const tentativas = [
            'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
            'video/mp4;codecs="avc1.42E01E"',
            'video/mp4;codecs=avc1.42E01E',
            'video/mp4'
        ];
        for (const m of tentativas) {
            if (MediaRecorder.isTypeSupported(m)) {
                mrMP4Mime = m;
                console.log('MediaRecorder MP4 disponível:', m);
                break;
            }
        }
    }

    const hasMP4 = !!(wcMuxer || mrMP4Mime);
    const HDOT = document.getElementById('HDOT');
    const HTXT = document.getElementById('HTXT');
    if (hasMP4) {
        HDOT.classList.add('ok');
        HTXT.textContent = 'Saída MP4 disponível';
    } else {
        HDOT.classList.add('no');
        HTXT.textContent = 'Saída WebM (use Chrome para MP4)';
    }

    /* ================================================================
       ESTADO
       ================================================================ */
    const S = {
        file: null, sel: null, selecting: false, selStart: null,
        processing: false, resultBlob: null, resultUrl: null,
        cfg: { feath: 4, quality: 'medium' }
    };

    /* ================================================================
       REFERÊNCIAS DOM
       ================================================================ */
    const $ = s => document.querySelector(s);
    const DZ = $('#DZ'), FI = $('#FI');
    const VID = $('#VID'), OC = $('#OC'), ox = OC.getContext('2d');
    const VI = $('#VI'), SB = $('#SB');
    const PC = $('#PC'), px = PC.getContext('2d');
    const POV = $('#POV'), PFL = $('#PFL'), PTM = $('#PTM'), PPC = $('#PPC'), PST = $('#PST');
    const BT_PROC = $('#BT_PROC'), BT_CLR = $('#BT_CLR'), BT_NEW = $('#BT_NEW');
    const BT_DL = $('#BT_DL'), BT_RE = $('#BT_RE'), RES_VID = $('#RES_VID');
    const CB_PP = $('#CB_PP'), CB_SK = $('#CB_SK'), CB_TM = $('#CB_TM');

    // Canvas temporário para feathering
    const tmpC = document.createElement('canvas');
    const tmpX = tmpC.getContext('2d');

    /* ================================================================
       UTILITÁRIOS
       ================================================================ */
    function fmt(s) {
        const m = Math.floor(s / 60), sec = Math.floor(s % 60);
        return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }
    function fmtSz(b) {
        if (b < 1024) return b + ' B';
        if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
        return (b / 1048576).toFixed(1) + ' MB';
    }
    function toast(msg, tipo = 'inf') {
        const c = $('#TC'), el = document.createElement('div');
        el.className = 'toast ' + tipo;
        const ic = { ok: 'fa-check-circle', err: 'fa-exclamation-circle', inf: 'fa-info-circle' };
        el.innerHTML = '<i class="fas ' + ic[tipo] + '"></i><span>' + msg + '</span>';
        c.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0'; el.style.transform = 'translateX(30px)'; el.style.transition = '.3s';
            setTimeout(() => el.remove(), 300);
        }, 4500);
    }
    function setStep(n) {
        for (let i = 1; i <= 4; i++) {
            const e = $('#S' + i);
            e.classList.remove('on', 'ok');
            if (i < n) e.classList.add('ok');
            else if (i === n) e.classList.add('on');
        }
    }
    function updBtns() {
        const ok = !!(S.sel && S.sel.w > 4 && S.sel.h > 4 && !S.processing);
        BT_PROC.disabled = !ok;
        BT_CLR.disabled = !ok;
    }

    /* ================================================================
       CONVERSÃO DE COORDENADAS
       ================================================================ */
    function cPos(e) {
        const r = OC.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return { x: t.clientX - r.left, y: t.clientY - r.top };
    }
    function d2v(dx, dy) {
        return {
            x: Math.round(dx * VID.videoWidth / OC.width),
            y: Math.round(dy * VID.videoHeight / OC.height)
        };
    }
    function v2d(vx, vy, vw, vh) {
        return {
            x: vx * OC.width / VID.videoWidth,
            y: vy * OC.height / VID.videoHeight,
            w: vw * OC.width / VID.videoWidth,
            h: vh * OC.height / VID.videoHeight
        };
    }

    /* ================================================================
       UPLOAD
       ================================================================ */
    DZ.addEventListener('click', () => FI.click());
    DZ.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') FI.click(); });
    DZ.addEventListener('dragover', e => { e.preventDefault(); DZ.classList.add('over'); });
    DZ.addEventListener('dragleave', () => DZ.classList.remove('over'));
    DZ.addEventListener('drop', e => {
        e.preventDefault(); DZ.classList.remove('over');
        const f = e.dataTransfer.files;
        if (f.length && f[0].type.startsWith('video/')) loadVid(f[0]);
        else toast('Selecione um arquivo de vídeo válido.', 'err');
    });
    FI.addEventListener('change', () => { if (FI.files.length) loadVid(FI.files[0]); });

    function loadVid(file) {
        S.file = file; S.sel = null;
        if (S.resultUrl) URL.revokeObjectURL(S.resultUrl);
        S.resultBlob = null; S.resultUrl = null;

        const url = URL.createObjectURL(file);
        VID.src = url; VID.load();

        VID.onloadedmetadata = () => {
            $('#IN').textContent = file.name.length > 20 ? file.name.slice(0, 18) + '…' : file.name;
            $('#IN').title = file.name;
            $('#IS').textContent = fmtSz(file.size);
            $('#IR').textContent = VID.videoWidth + '×' + VID.videoHeight;
            $('#ID').textContent = fmt(VID.duration);
            CB_SK.max = Math.max(1, Math.floor(VID.duration * 30));
            clearOC(); SB.style.display = 'none';
            $('#SEC_UP').classList.add('hidden');
            $('#SEC_ED').classList.remove('hidden');
            $('#SEC_RES').classList.add('hidden');
            setStep(2); updBtns();
            VID.currentTime = 0;
            VID.play().catch(() => {});
            toast('Vídeo carregado!', 'ok');
        };
        VID.onerror = () => toast('Erro ao carregar o vídeo.', 'err');
    }

    /* ================================================================
       OVERLAY — ResizeObserver no <video> para alinhamento exato
       ================================================================ */
    const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
            const w = Math.round(entry.contentRect.width);
            const h = Math.round(entry.contentRect.height);
            if (w > 0 && h > 0 && (OC.width !== w || OC.height !== h)) {
                OC.width = w; OC.height = h;
                if (S.sel && !S.selecting) drawSel();
            }
        }
    });
    ro.observe(VID);

    /* ================================================================
       CONTROLES DE VÍDEO
       ================================================================ */
    CB_PP.addEventListener('click', () => {
        if (S.processing) return;
        if (VID.paused) { VID.play(); CB_PP.innerHTML = '<i class="fas fa-pause"></i>'; }
        else { VID.pause(); CB_PP.innerHTML = '<i class="fas fa-play"></i>'; }
    });
    CB_SK.addEventListener('input', () => { if (!S.processing) VID.currentTime = CB_SK.value / 30; });
    VID.addEventListener('timeupdate', () => {
        if (S.processing) return;
        CB_SK.value = Math.floor(VID.currentTime * 30);
        CB_TM.textContent = fmt(VID.currentTime) + ' / ' + fmt(VID.duration);
    });
    VID.addEventListener('play', () => { CB_PP.innerHTML = '<i class="fas fa-pause"></i>'; });
    VID.addEventListener('pause', () => { CB_PP.innerHTML = '<i class="fas fa-play"></i>'; });

    /* ================================================================
       SELEÇÃO DE ÁREA
       ================================================================ */
    function clearOC() { ox.clearRect(0, 0, OC.width, OC.height); }

    OC.addEventListener('mousedown', selStart);
    OC.addEventListener('mousemove', selMove);
    OC.addEventListener('mouseup', selEnd);
    OC.addEventListener('mouseleave', selEnd);
    OC.addEventListener('touchstart', e => { e.preventDefault(); selStart(e); }, { passive: false });
    OC.addEventListener('touchmove', e => { e.preventDefault(); selMove(e); }, { passive: false });
    OC.addEventListener('touchend', selEnd);

    function selStart(e) {
        if (S.processing) return;
        S.selecting = true; S.selStart = cPos(e); S.sel = null;
        SB.style.display = 'none'; clearOC();
    }
    function selMove(e) {
        if (!S.selecting) return;
        const p = cPos(e), st = S.selStart;
        const dx = Math.min(st.x, p.x), dy = Math.min(st.y, p.y);
        const dw = Math.abs(p.x - st.x), dh = Math.abs(p.y - st.y);
        const vs = d2v(dx, dy), ve = d2v(dx + dw, dy + dh);
        const vw = Math.max(4, ve.x - vs.x), vh = Math.max(4, ve.y - vs.y);
        S.sel = {
            x: Math.max(0, vs.x), y: Math.max(0, vs.y),
            w: Math.min(vw, VID.videoWidth - vs.x),
            h: Math.min(vh, VID.videoHeight - vs.y)
        };
        drawSel();
        SB.style.display = 'block';
        SB.textContent = S.sel.w + ' × ' + S.sel.h;
    }
    function selEnd() {
        if (!S.selecting) return;
        S.selecting = false;
        if (!S.sel || S.sel.w < 5 || S.sel.h < 5) {
            S.sel = null; clearOC(); SB.style.display = 'none';
        } else {
            toast('Região selecionada.', 'inf');
        }
        updBtns();
    }

    let selAnim = 0;
    function drawSel() {
        cancelAnimationFrame(selAnim);
        clearOC();
        if (!S.sel) return;
        const d = v2d(S.sel.x, S.sel.y, S.sel.w, S.sel.h);
        ox.fillStyle = 'rgba(0,0,0,.5)';
        ox.fillRect(0, 0, OC.width, OC.height);
        ox.clearRect(d.x, d.y, d.w, d.h);
        ox.save();
        ox.strokeStyle = '#00d4aa'; ox.lineWidth = 2;
        ox.setLineDash([6, 4]); ox.lineDashOffset = -performance.now() / 50;
        ox.strokeRect(d.x, d.y, d.w, d.h);
        ox.restore();
        const hs = 5; ox.fillStyle = '#00d4aa';
        [[d.x, d.y], [d.x + d.w, d.y], [d.x, d.y + d.h], [d.x + d.w, d.y + d.h]].forEach(([cx, cy]) => {
            ox.fillRect(cx - hs, cy - hs, hs * 2, hs * 2);
        });
        if (!S.processing) selAnim = requestAnimationFrame(drawSel);
    }

    /* ================================================================
       CONFIGURAÇÕES
       ================================================================ */
    $('#CFG_F').addEventListener('input', e => { S.cfg.feath = +e.target.value; $('#VL_F').textContent = e.target.value + 'px'; });
    $('#CFG_Q').addEventListener('change', e => { S.cfg.quality = e.target.value; });

    /* ================================================================
       INPAINTING — Interpolação inteligente
       ================================================================ */
    function inpaint(ctx, mask, feath) {
        const { x, y, w, h } = mask;
        const cw = ctx.canvas.width, ch = ctx.canvas.height;
        const sx = Math.max(0, Math.round(x)), sy = Math.max(0, Math.round(y));
        const sw = Math.min(Math.round(w), cw - sx), sh = Math.min(Math.round(h), ch - sy);
        if (sw < 2 || sh < 2) return;

        const src = ctx.getImageData(0, 0, cw, ch).data;
        const bs = Math.max(2, Math.min(Math.floor(feath) + 3, Math.floor(Math.min(sw, sh) / 4)));

        // Pré-calcular médias por coluna: topo e base
        const tA = new Float32Array(sw * 3), bA = new Float32Array(sw * 3);
        for (let px = 0; px < sw; px++) {
            let tr = 0, tg = 0, tb = 0, br = 0, bg = 0, bb = 0;
            for (let s = 1; s <= bs; s++) {
                const ty = Math.max(0, sy - s), ti = (ty * cw + (sx + px)) * 4;
                tr += src[ti]; tg += src[ti + 1]; tb += src[ti + 2];
                const by = Math.min(ch - 1, sy + sh - 1 + s), bi = (by * cw + (sx + px)) * 4;
                br += src[bi]; bg += src[bi + 1]; bb += src[bi + 2];
            }
            tA[px * 3] = tr / bs; tA[px * 3 + 1] = tg / bs; tA[px * 3 + 2] = tb / bs;
            bA[px * 3] = br / bs; bA[px * 3 + 1] = bg / bs; bA[px * 3 + 2] = bb / bs;
        }

        // Pré-calcular médias por linha: esquerda e direita
        const lA = new Float32Array(sh * 3), rA = new Float32Array(sh * 3);
        for (let py = 0; py < sh; py++) {
            let lr = 0, lg = 0, lb = 0, rr = 0, rg = 0, rb = 0;
            for (let s = 1; s <= bs; s++) {
                const lx = Math.max(0, sx - s), li = ((sy + py) * cw + lx) * 4;
                lr += src[li]; lg += src[li + 1]; lb += src[li + 2];
                const rx = Math.min(cw - 1, sx + sw - 1 + s), ri = ((sy + py) * cw + rx) * 4;
                rr += src[ri]; rg += src[ri + 1]; rb += src[ri + 2];
            }
            lA[py * 3] = lr / bs; lA[py * 3 + 1] = lg / bs; lA[py * 3 + 2] = lb / bs;
            rA[py * 3] = rr / bs; rA[py * 3 + 1] = rg / bs; rA[py * 3 + 2] = rb / bs;
        }

        // Interpolar cada pixel (vertical + horizontal, média das duas)
        const imgD = ctx.getImageData(sx, sy, sw, sh), d = imgD.data;
        const hMax = Math.max(1, sh - 1), wMax = Math.max(1, sw - 1);
        for (let py = 0; py < sh; py++) {
            const ny = py / hMax;
            for (let px = 0; px < sw; px++) {
                const nx = px / wMax, idx = (py * sw + px) * 4;
                d[idx]     = (tA[px*3]   + (bA[px*3]   - tA[px*3])   * ny + lA[py*3]   + (rA[py*3]   - lA[py*3])   * nx) * .5;
                d[idx + 1] = (tA[px*3+1] + (bA[px*3+1] - tA[px*3+1]) * ny + lA[py*3+1] + (rA[py*3+1] - lA[py*3+1]) * nx) * .5;
                d[idx + 2] = (tA[px*3+2] + (bA[px*3+2] - tA[px*3+2]) * ny + lA[py*3+2] + (rA[py*3+2] - lA[py*3+2]) * nx) * .5;
            }
        }
        ctx.putImageData(imgD, sx, sy);

        // Suavização de bordas com blur leve
        if (feath > 0) {
            const fr = Math.max(1, Math.round(feath * .6));
            tmpC.width = cw; tmpC.height = ch;
            tmpX.filter = 'blur(' + fr + 'px)';
            tmpX.drawImage(ctx.canvas, 0, 0);
            tmpX.filter = 'none';
            ctx.drawImage(tmpC, sx, sy, sw, sh, sx, sy, sw, sh);
        }
    }

    /* ================================================================
       PROCESSAMENTO — roteador
       ================================================================ */
    BT_PROC.addEventListener('click', startProc);

    async function startProc() {
        if (!S.sel || S.processing) return;
        S.processing = true; setStep(3); updBtns(); clearOC();

        PC.width = VID.videoWidth; PC.height = VID.videoHeight;
        POV.classList.remove('hidden');
        PFL.style.width = '0%'; PPC.textContent = '0%';
        PTM.textContent = '00:00 / ' + fmt(VID.duration);
        PST.innerHTML = '<i class="fas fa-cog fa-spin"></i> Processando vídeo...';

        try {
            if (mrMP4Mime) {
                console.log('Usando MediaRecorder MP4:', mrMP4Mime);
                await procMR_MP4();
            } else if (wcMuxer) {
                console.log('Usando WebCodecs + mp4-muxer');
                await procWC_MP4();
            } else {
                console.log('Usando WebM (fallback)');
                await procWebM();
            }
        } catch (e) {
            console.error('Falha no processamento:', e);
            if (S.processing) {
                POV.classList.add('hidden'); S.processing = false; updBtns();
                toast('Erro: ' + e.message, 'err');
            }
        }
    }

    /* ------------------------------------------------------------------
       MÉTODO 1: MediaRecorder com MP4 (Chrome 127+, preserva áudio)
       ------------------------------------------------------------------ */
    function procMR_MP4() {
        return new Promise((resolve, reject) => {
            const w = PC.width, h = PC.height, dur = VID.duration;
            const brMap = { high: 5e6, medium: 2.5e6, low: 1e6 };
            const bitrate = brMap[S.cfg.quality] || 2.5e6;
            let done = false;

            // Criar stream do canvas + áudio do vídeo
            const stream = PC.captureStream(30);
            let hasAudio = false;
            try {
                if (typeof VID.captureStream === 'function') {
                    const vs = VID.captureStream();
                    vs.getAudioTracks().forEach(t => { stream.addTrack(t); hasAudio = true; });
                }
            } catch (e) { /* sem áudio */ }

            const rec = new MediaRecorder(stream, { mimeType: mrMP4Mime, videoBitsPerSecond: bitrate });
            const chunks = [];
            rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
            rec.onstop = () => {
                if (done) return; done = true;
                clearTimeout(safety);
                VID.pause();
                S.resultBlob = new Blob(chunks, { type: 'video/mp4' });
                if (S.resultUrl) URL.revokeObjectURL(S.resultUrl);
                S.resultUrl = URL.createObjectURL(S.resultBlob);
                S.processing = false;
                const note = hasAudio
                    ? 'Vídeo processado em MP4 com áudio preservado.'
                    : 'Vídeo processado em MP4. O áudio não pôde ser capturado neste navegador.';
                showResult(note); resolve();
            };
            rec.onerror = e => {
                if (done) return; done = true;
                clearTimeout(safety); VID.pause();
                S.processing = false; POV.classList.add('hidden');
                reject(new Error('MediaRecorder: ' + (e.error ? e.error.message : 'erro desconhecido')));
            };

            rec.start(100);

            const safety = setTimeout(() => {
                if (done) return;
                toast('Tempo limite atingido, finalizando...', 'inf');
                try { rec.stop(); } catch (e) {}
            }, (dur + 30) * 1000);

            // Voltar ao início
            VID.currentTime = 0;
            const waitSeek = new Promise(r => {
                if (VID.currentTime < 0.05) { r(); return; }
                const h = () => { VID.removeEventListener('seeked', h); r(); };
                VID.addEventListener('seeked', h);
                setTimeout(r, 3000);
            });

            waitSeek.then(() => {
                VID.play().catch(() => {});
                let lastT = 0, stuck = 0;

                function loop() {
                    if (done) return;
                    const vt = VID.currentTime;

                    // Detecção de travamento
                    if (Math.abs(vt - lastT) < 0.0003) {
                        stuck++;
                        if (stuck > 60) { VID.play().catch(() => {}); stuck = 0; }
                    } else { stuck = 0; }
                    lastT = vt;

                    px.drawImage(VID, 0, 0, w, h);
                    inpaint(px, S.sel, S.cfg.feath);

                    const pct = Math.min(100, Math.round(vt / dur * 100));
                    PFL.style.width = pct + '%'; PPC.textContent = pct + '%';
                    PTM.textContent = fmt(vt) + ' / ' + fmt(dur);

                    if (VID.ended || vt >= dur - 0.05) {
                        PST.innerHTML = '<i class="fas fa-check-circle"></i> Finalizando arquivo...';
                        setTimeout(() => { if (!done) try { rec.stop(); } catch(e){} }, 400);
                        return;
                    }
                    requestAnimationFrame(loop);
                }
                requestAnimationFrame(loop);
            });
        });
    }

    /* ------------------------------------------------------------------
       MÉTODO 2: WebCodecs + mp4-muxer (MP4 real, sem áudio)
       ------------------------------------------------------------------ */
    async function procWC_MP4() {
        const w = PC.width, h = PC.height, dur = VID.duration;
        const brMap = { high: 5e6, medium: 2.5e6, low: 1e6 };
        const bitrate = brMap[S.cfg.quality] || 2.5e6;
        let done = false;

        // Encontrar codec H264 compatível
        const codecs = ['avc1.640028', 'avc1.64001F', 'avc1.42001F', 'avc1.42001E'];
        let codec = '';
        for (const c of codecs) {
            try {
                const r = await VideoEncoder.isConfigSupported({ codec: c, width: w, height: h, bitrate });
                if (r.supported) { codec = c; break; }
            } catch (e) {}
        }
        if (!codec) throw new Error('Nenhum codec H264 suportado pelo WebCodecs.');

        // Criar muxer
        const MuxerClass = wcMuxer.Muxer || wcMuxer.MP4Muxer;
        const TargetClass = wcMuxer.ArrayBufferTarget;
        if (!MuxerClass || !TargetClass) throw new Error('mp4-muxer: classes não encontradas no módulo.');

        const target = new TargetClass();
        let muxer;
        try {
            muxer = new MuxerClass({
                target,
                video: { codec: 'avc', width: w, height: h },
                fastStart: 'in-memory'
            });
        } catch (e) {
            throw new Error('Erro ao criar muxer MP4: ' + e.message);
        }

        const encoder = new VideoEncoder({
            output: (chunk, meta) => { try { muxer.addVideoChunk(chunk, meta); } catch(e){} },
            error: e => console.error('VideoEncoder:', e)
        });
        encoder.configure({ codec, width: w, height: h, bitrate, framerate: 30, latencyMode: 'quality' });

        // Voltar ao início
        await new Promise(r => {
            if (VID.currentTime < 0.05) { r(); return; }
            VID.addEventListener('seeked', r, { once: true });
            setTimeout(r, 3000);
        });
        VID.play().catch(() => {});
        await new Promise(r => setTimeout(r, 150));

        let lastT = 0, stuck = 0, frameIdx = 0;

        const safety = setTimeout(() => {
            if (done) return;
            toast('Tempo limite atingido, finalizando...', 'inf');
            finish();
        }, (dur + 30) * 1000);

        function finish() {
            if (done) return; done = true;
            clearTimeout(safety); VID.pause();
            try {
                encoder.flush().then(() => {
                    encoder.close();
                    muxer.finalize();
                    buildResult();
                }).catch(() => {
                    try { encoder.close(); muxer.finalize(); buildResult(); } catch(e) { buildResult(); }
                });
            } catch (e) { buildResult(); }
        }

        function buildResult() {
            S.processing = false;
            try {
                S.resultBlob = new Blob([target.buffer], { type: 'video/mp4' });
                if (S.resultUrl) URL.revokeObjectURL(S.resultUrl);
                S.resultUrl = URL.createObjectURL(S.resultBlob);
                showResult('Vídeo processado em MP4 via WebCodecs. Sem faixa de áudio — para adicionar o áudio original use: ffmpeg -i original.mp4 -i resultado.mp4 -c copy saida.mp4');
            } catch (e) {
                POV.classList.add('hidden');
                toast('Erro ao gerar o arquivo MP4.', 'err');
            }
        }

        await new Promise(resolve => {
            function loop() {
                if (done) { resolve(); return; }
                const vt = VID.currentTime;

                if (Math.abs(vt - lastT) < 0.0003) {
                    stuck++;
                    if (stuck > 60) { VID.play().catch(() => {}); stuck = 0; }
                } else { stuck = 0; }
                lastT = vt;

                px.drawImage(VID, 0, 0, w, h);
                inpaint(px, S.sel, S.cfg.feath);

                // Codificar frame (limitar fila para não estourar memória)
                if (encoder.encodeQueueSize < 10) {
                    const ts = Math.max(0, Math.round(vt * 1e6));
                    const kf = frameIdx % 60 === 0;
                    try {
                        const frame = new VideoFrame(PC, { timestamp: ts });
                        encoder.encode(frame, { keyFrame: kf });
                        frame.close();
                        frameIdx++;
                    } catch (e) { /* pular frame */ }
                }

                const pct = Math.min(100, Math.round(vt / dur * 100));
                PFL.style.width = pct + '%'; PPC.textContent = pct + '%';
                PTM.textContent = fmt(vt) + ' / ' + fmt(dur);

                if (VID.ended || vt >= dur - 0.05) {
                    // Último frame
                    try {
                        const frame = new VideoFrame(PC, { timestamp: Math.round(dur * 1e6) });
                        encoder.encode(frame, { keyFrame: false });
                        frame.close();
                    } catch (e) {}
                    PST.innerHTML = '<i class="fas fa-check-circle"></i> Finalizando arquivo...';
                    setTimeout(() => { finish(); resolve(); }, 800);
                    return;
                }
                requestAnimationFrame(loop);
            }
            requestAnimationFrame(loop);
        });
    }

    /* ------------------------------------------------------------------
       MÉTODO 3: WebM (fallback universal)
       ------------------------------------------------------------------ */
    function procWebM() {
        return new Promise((resolve, reject) => {
            const w = PC.width, h = PC.height, dur = VID.duration;
            const brMap = { high: 5e6, medium: 2.5e6, low: 1e6 };
            const bitrate = brMap[S.cfg.quality] || 2.5e6;
            let done = false;

            let mime = '';
            for (const m of ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']) {
                if (MediaRecorder.isTypeSupported(m)) { mime = m; break; }
            }
            if (!mime) {
                S.processing = false; POV.classList.add('hidden');
                reject(new Error('Nenhum codec de vídeo suportado pelo navegador.'));
                return;
            }

            const stream = PC.captureStream(30);
            let hasAudio = false;
            try {
                if (typeof VID.captureStream === 'function') {
                    const vs = VID.captureStream();
                    vs.getAudioTracks().forEach(t => { stream.addTrack(t); hasAudio = true; });
                }
            } catch (e) {}

            const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
            const chunks = [];
            rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
            rec.onstop = () => {
                if (done) return; done = true;
                clearTimeout(safety); VID.pause();
                S.resultBlob = new Blob(chunks, { type: mime });
                if (S.resultUrl) URL.revokeObjectURL(S.resultUrl);
                S.resultUrl = URL.createObjectURL(S.resultBlob);
                S.processing = false;
                const note = hasAudio
                    ? 'Vídeo processado em WebM com áudio. Use Chrome para saída em MP4.'
                    : 'Vídeo processado em WebM (sem áudio). Use Chrome para saída em MP4.';
                showResult(note); resolve();
            };
            rec.onerror = e => {
                if (done) return; done = true;
                clearTimeout(safety); VID.pause();
                S.processing = false; POV.classList.add('hidden');
                reject(new Error('MediaRecorder: ' + (e.error ? e.error.message : 'erro desconhecido')));
            };

            rec.start(100);

            const safety = setTimeout(() => {
                if (done) return;
                toast('Tempo limite atingido, finalizando...', 'inf');
                try { rec.stop(); } catch(e){}
            }, (dur + 30) * 1000);

            VID.currentTime = 0;
            const waitSeek = new Promise(r => {
                if (VID.currentTime < 0.05) { r(); return; }
                const h = () => { VID.removeEventListener('seeked', h); r(); };
                VID.addEventListener('seeked', h);
                setTimeout(r, 3000);
            });

            waitSeek.then(() => {
                VID.play().catch(() => {});
                let lastT = 0, stuck = 0;

                function loop() {
                    if (done) return;
                    const vt = VID.currentTime;
                    if (Math.abs(vt - lastT) < 0.0003) {
                        stuck++;
                        if (stuck > 60) { VID.play().catch(() => {}); stuck = 0; }
                    } else { stuck = 0; }
                    lastT = vt;

                    px.drawImage(VID, 0, 0, w, h);
                    inpaint(px, S.sel, S.cfg.feath);

                    const pct = Math.min(100, Math.round(vt / dur * 100));
                    PFL.style.width = pct + '%'; PPC.textContent = pct + '%';
                    PTM.textContent = fmt(vt) + ' / ' + fmt(dur);

                    if (VID.ended || vt >= dur - 0.05) {
                        PST.innerHTML = '<i class="fas fa-check-circle"></i> Finalizando arquivo...';
                        setTimeout(() => { if (!done) try { rec.stop(); } catch(e){} }, 400);
                        return;
                    }
                    requestAnimationFrame(loop);
                }
                requestAnimationFrame(loop);
            });
        });
    }

    /* ================================================================
       RESULTADO
       ================================================================ */
    function showResult(note) {
        POV.classList.add('hidden');
        RES_VID.src = S.resultUrl;
        $('#RES_SUB').textContent = note;
        $('#SEC_ED').classList.add('hidden');
        $('#SEC_RES').classList.remove('hidden');
        setStep(4);
        const ext = S.resultBlob && S.resultBlob.type.includes('mp4') ? 'MP4' : 'WebM';
        toast('Pronto! ' + fmtSz(S.resultBlob.size) + ' (' + ext + ')', 'ok');
    }

    /* ================================================================
       DOWNLOAD
       ================================================================ */
    BT_DL.addEventListener('click', () => {
        if (!S.resultUrl) return;
        const ext = S.resultBlob && S.resultBlob.type.includes('mp4') ? 'mp4' : 'webm';
        const base = S.file ? S.file.name.replace(/\.[^.]+$/, '') : 'video';
        const a = document.createElement('a');
        a.href = S.resultUrl;
        a.download = base + '_sem_marca.' + ext;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        toast('Download iniciado!', 'ok');
    });

    /* ================================================================
       NAVEGAÇÃO
       ================================================================ */
    BT_CLR.addEventListener('click', () => {
        S.sel = null; clearOC(); SB.style.display = 'none'; updBtns();
        toast('Seleção removida.', 'inf');
    });
    BT_NEW.addEventListener('click', goBack);
    BT_RE.addEventListener('click', goBack);
    function goBack() {
        if (S.processing) return;
        if (S.resultUrl) URL.revokeObjectURL(S.resultUrl);
        S.file = null; S.sel = null; S.processing = false;
        S.resultBlob = null; S.resultUrl = null;
        VID.pause(); VID.removeAttribute('src'); VID.load();
        FI.value = '';
        $('#SEC_ED').classList.add('hidden');
        $('#SEC_RES').classList.add('hidden');
        $('#SEC_UP').classList.remove('hidden');
        setStep(1);
    }

})();