// Финальная версия sketch.js для генератора сечений
(function() {
    // Ждём загрузки Maker.js
    function waitForMaker() {
        if (typeof makerjs === 'undefined') {
            setTimeout(waitForMaker, 50);
            return;
        }
        init();
    }
    waitForMaker();

    function init() {
        let currentModel = null;

        // Функция создания модели
        function createPipeCaseModel(pipeOD, caseOD) {
            const pipeRadius = pipeOD / 2;
            const caseRadius = caseOD / 2;
            const statusMsg = document.getElementById('statusMsg');
            if (pipeOD > caseOD) {
                statusMsg.innerHTML = '⚠️ Ошибка: труба больше футляра';
                return null;
            }
            statusMsg.innerHTML = '✅ Чертеж успешно создан.';

            const model = { paths: {}, models: {} };
            // Футляр (чёрный)
            model.paths.case = new makerjs.paths.Circle({ x: 0, y: 0 }, caseRadius);
            model.paths.case.layer = 'black';
            // Труба (синяя)
            model.paths.pipe = new makerjs.paths.Circle({ x: 0, y: 0 }, pipeRadius);
            model.paths.pipe.layer = 'blue';

            // Размерная линия
            const yPos = pipeRadius + 25;
            const xStart = -pipeRadius - 15;
            const xEnd = pipeRadius + 15;
            model.paths.dimLine = new makerjs.paths.Line({ x: xStart, y: yPos }, { x: xEnd, y: yPos });
            model.paths.dimLine.layer = 'green';
            // Выноски
            model.paths.leftGuide = new makerjs.paths.Line({ x: -pipeRadius, y: pipeRadius }, { x: -pipeRadius, y: yPos });
            model.paths.rightGuide = new makerjs.paths.Line({ x: pipeRadius, y: pipeRadius }, { x: pipeRadius, y: yPos });
            model.paths.leftGuide.layer = 'green';
            model.paths.rightGuide.layer = 'green';
            // Стрелки
            const arrowSize = 3;
            model.paths.leftArrow1 = new makerjs.paths.Line({ x: xStart, y: yPos }, { x: xStart + arrowSize, y: yPos - arrowSize });
            model.paths.leftArrow2 = new makerjs.paths.Line({ x: xStart, y: yPos }, { x: xStart + arrowSize, y: yPos + arrowSize });
            model.paths.rightArrow1 = new makerjs.paths.Line({ x: xEnd, y: yPos }, { x: xEnd - arrowSize, y: yPos - arrowSize });
            model.paths.rightArrow2 = new makerjs.paths.Line({ x: xEnd, y: yPos }, { x: xEnd - arrowSize, y: yPos + arrowSize });
            const arrows = ['leftArrow1','leftArrow2','rightArrow1','rightArrow2'];
            arrows.forEach(a => { if (model.paths[a]) model.paths[a].layer = 'green'; });

            // Текст размера
            model.models.dimText = new makerjs.models.Text(`${pipeOD} мм`, 0, yPos + 8, { fontSize: 12, font: 'Arial', textAlign: 'center' });
            model.models.dimText.layer = 'green';
            // Подписи
            model.models.pipeLabel = new makerjs.models.Text('ТРУБА', pipeRadius + 15, 0, { fontSize: 10, font: 'Arial', textAlign: 'center' });
            model.models.pipeLabel.layer = 'blue';
            model.models.caseLabel = new makerjs.models.Text('ФУТЛЯР', caseRadius + 15, caseRadius - 20, { fontSize: 10, font: 'Arial', textAlign: 'center' });
            model.models.caseLabel.layer = 'black';
            return model;
        }

        // Отрисовка на canvas
        function renderToCanvas(model, canvasId) {
            if (!model) return;
            const canvas = document.getElementById(canvasId);
            const svgString = makerjs.exporter.toSVG(model, { useSvgPathOnly: false });
            const img = new Image();
            img.onload = () => {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.85;
                const x = (canvas.width - img.width * scale) / 2;
                const y = (canvas.height - img.height * scale) / 2;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            };
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
        }

        // Экспорт DXF
        function exportToDXF(model) {
            if (!model) { alert('Сначала сгенерируйте чертеж'); return; }
            const backup = model.models.dimText;
            delete model.models.dimText;
            const dxf = makerjs.exporter.toDXF(model);
            model.models.dimText = backup;
            const blob = new Blob([dxf], { type: 'application/dxf' });
            saveAs(blob, `sechenie_${Date.now()}.dxf`);
        }

        // Экспорт PDF
        function exportToPDF(model) {
            if (!model) { alert('Сначала сгенерируйте чертеж'); return; }
            const canvas = document.createElement('canvas');
            const svgString = makerjs.exporter.toSVG(model, { useSvgPathOnly: false });
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save(`sechenie_${Date.now()}.pdf`);
            };
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
        }

        // Навешиваем обработчики
        const generateBtn = document.getElementById('generateBtn');
        const exportDxfBtn = document.getElementById('exportDxfBtn');
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        const pipeInput = document.getElementById('pipeOD');
        const caseInput = document.getElementById('caseOD');

        function generate() {
            const pipeOD = parseFloat(pipeInput.value);
            const caseOD = parseFloat(caseInput.value);
            if (isNaN(pipeOD) || isNaN(caseOD)) return;
            const model = createPipeCaseModel(pipeOD, caseOD);
            if (model) {
                currentModel = model;
                renderToCanvas(model, 'drawingCanvas');
            } else {
                currentModel = null;
            }
        }

        generateBtn.onclick = generate;
        exportDxfBtn.onclick = () => exportToDXF(currentModel);
        exportPdfBtn.onclick = () => exportToPDF(currentModel);
        generate(); // стартовый чертёж
    }
})();
