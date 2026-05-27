// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentModel = null;      // храним текущую модель для экспорта

// ========== ФУНКЦИЯ СОЗДАНИЯ МОДЕЛИ ==========
function createPipeCaseModel(pipeOD, caseOD) {
    // Радиусы (половина диаметра)
    const pipeRadius = pipeOD / 2;
    const caseRadius = caseOD / 2;

    // Проверка: труба не должна быть больше футляра
    if (pipeOD > caseOD) {
        document.getElementById('statusMsg').innerHTML = '⚠️ Ошибка: Диаметр трубы не может быть больше диаметра футляра!';
        return null;
    } else {
        document.getElementById('statusMsg').innerHTML = '✅ Чертеж успешно создан.';
    }

    // Создаем пустую модель
    const model = { paths: {}, models: {} };

    // 1. Футляр (внешняя окружность) – черный цвет
    const caseCircle = new makerjs.paths.Circle({ x: 0, y: 0 }, caseRadius);
    caseCircle.layer = 'black';
    model.paths.case = caseCircle;

    // 2. Труба (внутренняя окружность) – синий цвет
    const pipeCircle = new makerjs.paths.Circle({ x: 0, y: 0 }, pipeRadius);
    pipeCircle.layer = 'blue';
    model.paths.pipe = pipeCircle;

    // ===== РАЗМЕРНАЯ ЛИНИЯ ДЛЯ НАРУЖНОГО ДИАМЕТРА ТРУБЫ =====
    const yPos = pipeRadius + 25;                // вертикальное смещение линии
    const xStart = -pipeRadius - 15;             // левый конец линии
    const xEnd   =  pipeRadius + 15;             // правый конец линии

    // Горизонтальная размерная линия
    const dimLine = new makerjs.paths.Line({ x: xStart, y: yPos }, { x: xEnd, y: yPos });
    dimLine.layer = 'green';
    model.paths.dimLine = dimLine;

    // Вертикальные выноски от трубы к размерной линии
    const leftGuide = new makerjs.paths.Line({ x: -pipeRadius, y: pipeRadius }, { x: -pipeRadius, y: yPos });
    const rightGuide = new makerjs.paths.Line({ x: pipeRadius, y: pipeRadius }, { x: pipeRadius, y: yPos });
    leftGuide.layer = 'green';
    rightGuide.layer = 'green';
    model.paths.leftGuide = leftGuide;
    model.paths.rightGuide = rightGuide;

    // Стрелки на концах размерной линии
    const arrowSize = 3;
    // Левая стрелка
    const leftArrow1 = new makerjs.paths.Line({ x: xStart, y: yPos }, { x: xStart + arrowSize, y: yPos - arrowSize });
    const leftArrow2 = new makerjs.paths.Line({ x: xStart, y: yPos }, { x: xStart + arrowSize, y: yPos + arrowSize });
    leftArrow1.layer = 'green';
    leftArrow2.layer = 'green';
    model.paths.leftArrow1 = leftArrow1;
    model.paths.leftArrow2 = leftArrow2;

    // Правая стрелка
    const rightArrow1 = new makerjs.paths.Line({ x: xEnd, y: yPos }, { x: xEnd - arrowSize, y: yPos - arrowSize });
    const rightArrow2 = new makerjs.paths.Line({ x: xEnd, y: yPos }, { x: xEnd - arrowSize, y: yPos + arrowSize });
    rightArrow1.layer = 'green';
    rightArrow2.layer = 'green';
    model.paths.rightArrow1 = rightArrow1;
    model.paths.rightArrow2 = rightArrow2;

    // Текст размера (модель Text)
    const dimText = new makerjs.models.Text(`${pipeOD} мм`, 0, yPos + 8, {
        fontSize: 12,
        font: 'Arial',
        textAlign: 'center'
    });
    dimText.layer = 'green';
    model.models.dimText = dimText;

    // (Опционально) Добавим подпись "ТРУБА" и "ФУТЛЯР" для наглядности
    const pipeLabel = new makerjs.models.Text('ТРУБА', pipeRadius + 15, 0, { fontSize: 10, font: 'Arial', textAlign: 'center' });
    pipeLabel.layer = 'blue';
    const caseLabel = new makerjs.models.Text('ФУТЛЯР', caseRadius + 15, caseRadius - 20, { fontSize: 10, font: 'Arial', textAlign: 'center' });
    caseLabel.layer = 'black';
    model.models.pipeLabel = pipeLabel;
    model.models.caseLabel = caseLabel;

    return model;
}

// ========== ОТРИСОВКА НА CANVAS (через SVG) ==========
function renderToCanvas(model, canvasId) {
    if (!model) return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Преобразуем модель в SVG-строку
    let svgString;
    try {
        svgString = makerjs.exporter.toSVG(model, { useSvgPathOnly: false });
    } catch (e) {
        console.error(e);
        document.getElementById('statusMsg').innerHTML = 'Ошибка генерации SVG';
        return;
    }

    // Создаём временный image
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Масштабируем, чтобы чертеж вписался в canvas
        const scale = Math.min(canvas.width / (model.measure ? model.measure.width : 500), canvas.height / (model.measure ? model.measure.height : 500)) * 0.9;
        const xOffset = (canvas.width - (model.measure ? model.measure.width : 500) * scale) / 2;
        const yOffset = (canvas.height - (model.measure ? model.measure.height : 500) * scale) / 2;
        ctx.drawImage(img, xOffset, yOffset, (model.measure ? model.measure.width : 500) * scale, (model.measure ? model.measure.height : 500) * scale);
        URL.revokeObjectURL(url);
    };
    img.src = url;
}

// ========== ЭКСПОРТ В DXF ==========
function exportToDXF(model) {
    if (!model) {
        alert('Сначала сгенерируйте чертеж!');
        return;
    }
    // Временно удалим текстовые элементы, чтобы избежать проблем в AutoCAD (некоторые версии плохо импортят текст)
    const savedText = model.models.dimText;
    const savedPipeLabel = model.models.pipeLabel;
    const savedCaseLabel = model.models.caseLabel;
    delete model.models.dimText;
    delete model.models.pipeLabel;
    delete model.models.caseLabel;

    try {
        const dxfString = makerjs.exporter.toDXF(model);
        const blob = new Blob([dxfString], { type: 'application/dxf' });
        saveAs(blob, `сечение_труба_футляр.dxf`);
    } catch (err) {
        console.error(err);
        alert('Ошибка при экспорте DXF');
    }

    // Восстанавливаем текст
    model.models.dimText = savedText;
    model.models.pipeLabel = savedPipeLabel;
    model.models.caseLabel = savedCaseLabel;
}

// ========== ЭКСПОРТ В PDF (через canvg + jsPDF) ==========
function exportToPDF(model) {
    if (!model) {
        alert('Сначала сгенерируйте чертеж!');
        return;
    }

    // Получаем SVG строку
    const svgString = makerjs.exporter.toSVG(model, { useSvgPathOnly: false });
    // Создаем временный контейнер для SVG
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.innerHTML = svgString;
    document.body.appendChild(container);
    const svgElement = container.querySelector('svg');
    if (!svgElement) {
        document.body.removeChild(container);
        alert('Не удалось создать SVG для PDF');
        return;
    }

    // Получаем размеры SVG
    const bbox = svgElement.getBBox();
    const width = bbox.width || 500;
    const height = bbox.height || 500;

    // Создаем canvas для рендера
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Используем canvg для отрисовки SVG на canvas
    canvg(canvas, svgString, {
        ignoreMouse: true,
        ignoreAnimation: true,
        renderCallback: () => {
            // После отрисовки конвертируем в PDF
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            // Ориентация: landscape, если ширина больше высоты
            const orientation = width > height ? 'landscape' : 'portrait';
            const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            // Масштабируем картинку под страницу
            const ratio = Math.min(pdfWidth / width, pdfHeight / height) * 0.9;
            const imgWidth = width * ratio;
            const imgHeight = height * ratio;
            const xOffset = (pdfWidth - imgWidth) / 2;
            const yOffset = (pdfHeight - imgHeight) / 2;
            pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
            pdf.save('сечение_трубопровода.pdf');
            document.body.removeChild(container);
        }
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ==========
window.onload = () => {
    const generateBtn = document.getElementById('generateBtn');
    const exportDxfBtn = document.getElementById('exportDxfBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const pipeInput = document.getElementById('pipeOD');
    const caseInput = document.getElementById('caseOD');

    function generateAndRender() {
        const pipeOD = parseFloat(pipeInput.value);
        const caseOD = parseFloat(caseInput.value);
        if (isNaN(pipeOD) || isNaN(caseOD)) {
            document.getElementById('statusMsg').innerHTML = '❌ Введите числовые значения диаметров';
            return;
        }
        if (pipeOD <= 0 || caseOD <= 0) {
            document.getElementById('statusMsg').innerHTML = '❌ Диаметры должны быть положительными';
            return;
        }
        const model = createPipeCaseModel(pipeOD, caseOD);
        if (model) {
            currentModel = model;
            // Вычисляем ограничивающую рамку для правильного масштабирования
            model.measure = makerjs.measure.modelExtents(model);
            renderToCanvas(model, 'drawingCanvas');
        } else {
            currentModel = null;
        }
    }

    generateBtn.onclick = generateAndRender;
    exportDxfBtn.onclick = () => exportToDXF(currentModel);
    exportPdfBtn.onclick = () => exportToPDF(currentModel);

    // Генерируем начальный чертеж по умолчанию
    generateAndRender();
};
