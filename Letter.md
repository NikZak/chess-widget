# Инструкция по встраиванию виджета шахматных задач в GetCourse

## Быстрый старт

### Шаг 1: Добавьте блок HTML-код в урок GetCourse

В редакторе урока GetCourse добавьте блок **"HTML-код"** и вставьте туда код ниже.

### Шаг 2: Настройте задачи

В коде найдите секцию `// НАСТРОЙКИ ЗАДАЧ` и укажите ваши задачи:

```javascript
const puzzles = [
  {
    fen: "r3k2r/1b1p1pp1/3qp3/p1bP4/Pp3B2/6P1/1PP1QPB1/R4RK1 b kq - 0 1",
    moves: "d6d5,g2d5,b7d5,a1d1,h8h1",
    message: "Найдите выигрывающую комбинацию",
  },
  {
    fen: "2n2r2/2p2k2/1pbbpR1p/5r2/2P5/2PB1P2/q4P2/4RK2 w - - 0 1",
    moves: "f6f5,f7g8,a2g6,g8g6,f5f6,g6h5,f6h6",
    message: "Найдите мат в 5 ходов",
  },
];
```

**Формат:**

- `fen` — FEN-код позиции
- `moves` — ходы через запятую (формат: `e2e4,e7e5`)
- `message` — инструкция для ученика

### Шаг 3: Вставьте полный код

```html
<div id="chess-widget-container"></div>

<script>
  // ============================================================
  // НАСТРОЙКИ ЗАДАЧ (ИЗМЕНИТЕ ТОЛЬКО ЭТУ СЕКЦИЮ)
  // ============================================================

  const puzzles = [
    {
      fen: "r3k2r/1b1p1pp1/3qp3/p1bP4/Pp3B2/6P1/1PP1QPB1/R4RK1 b kq - 0 1",
      moves: "d6d5,g2d5,b7d5,a1d1,h8h1",
      message: "Найдите выигрывающую комбинацию",
    },
    {
      fen: "2n2r2/2p2k2/1pbbpR1p/5r2/2P5/2PB1P2/q4P2/4RK2 w - - 0 1",
      moves: "f6f5,f7g8,a2g6,g8g6,f5f6,g6h5,f6h6",
      message: "Найдите мат в 5 ходов",
    },
  ];

  // ============================================================
  // КОД НИЖЕ НЕ МЕНЯТЬ
  // ============================================================

  (function () {
    const container = document.getElementById("chess-widget-container");
    const iframe = document.createElement("iframe");

    // Формируем URL с задачами
    const baseUrl = "https://chess-widget-sable.vercel.app/";
    const puzzlesParam = puzzles
      .map(
        (p) =>
          encodeURIComponent(p.fen) +
          "|" +
          encodeURIComponent(p.moves) +
          "|" +
          encodeURIComponent(p.message || "")
      )
      .join(";");

    iframe.src = `${baseUrl}?puzzles=${puzzlesParam}&lang=ru`;
    iframe.style.width = "100%";
    iframe.style.height = "500px";
    iframe.style.border = "none";
    iframe.style.maxWidth = "500px";
    iframe.style.display = "block";
    iframe.style.margin = "0 auto";

    container.appendChild(iframe);

    let solvedCount = 0;
    const totalCount = puzzles.length;

    // Автоматическое изменение размера iframe
    window.addEventListener("message", function (event) {
      // Обновление высоты
      if (event.data && event.data.type === "CHESS_PUZZLE_HEIGHT") {
        iframe.style.height = event.data.height + "px";
      }

      // Решение задачи
      if (event.data && event.data.type === "CHESS_PUZZLE_SOLVED") {
        solvedCount++;

        // Записываем результат в поле ответа GetCourse
        // Ищем textarea для ответа (GetCourse использует id="LessonAnswer_answer_text" или name="LessonAnswer[answer_text]")
        const answerField =
          document.querySelector("#LessonAnswer_answer_text") ||
          document.querySelector(
            'textarea[name="LessonAnswer[answer_text]"]'
          ) ||
          document.querySelector('textarea[name="answer[text]"]') ||
          document.querySelector("textarea");

        if (answerField) {
          answerField.value = `Ученик решил ${solvedCount} из ${totalCount} задач.`;
          // Триггерим события для обновления формы GetCourse
          answerField.dispatchEvent(new Event("input", { bubbles: true }));
          answerField.dispatchEvent(new Event("change", { bubbles: true }));
        }

        // Автоматическая отправка при решении всех задач
        if (solvedCount === totalCount) {
          // Ищем кнопку отправки GetCourse
          setTimeout(function () {
            // GetCourse использует кнопку с name="send-answer" и классом "btn-send-answer"
            const submitBtn =
              document.querySelector(
                'button[name="send-answer"].btn-send-answer'
              ) ||
              document.querySelector("button.btn-send-answer") ||
              document.querySelector('button[name="send-answer"]') ||
              document.querySelector(".btn-send-answer.btn-primary");

            if (submitBtn) {
              // Убеждаемся, что форма готова к отправке
              const form = document.querySelector("#lessonAnswerForm");
              if (form) {
                // Устанавливаем скрытое поле для отправки
                const sendAnswerInput =
                  form.querySelector(".send-answer-value");
                if (sendAnswerInput) {
                  sendAnswerInput.setAttribute("name", "send-answer");
                }
              }

              // Кликаем кнопку отправки
              submitBtn.click();
            }
          }, 1500); // Увеличиваем задержку для надежности
        }
      }
    });
  })();
</script>
```

## Как это работает

1. **Ученик видит задачи** — виджет отображает все задачи одна под другой
2. **Ученик решает задачи** — делает ходы на доске
3. **Автоматическая запись результата** — при решении каждой задачи результат записывается в поле ответа
4. **Автоматическая отправка** — когда все задачи решены, форма отправляется автоматически

## Формат ходов

Ходы записываются в формате `откудакуда`:

- `e2e4` — пешка с e2 на e4
- `g1f3` — конь с g1 на f3
- `e1g1` — рокировка

**Для задач с ответами противника:** ходы чередуются через запятую:

```
moves=d6d5,g2d5,b7d5
```

Это означает: игрок d6→d5, противник g2→d5, игрок b7→d5

## Примеры FEN-кодов

**Начальная позиция:**

```
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
```

**Позиция из задачи:**

```
r3k2r/1b1p1pp1/3qp3/p1bP4/Pp3B2/6P1/1PP1QPB1/R4RK1 b kq - 0 1
```

## Важные моменты

- ✅ Виджет автоматически определяет, за какой цвет играет ученик
- ✅ Проверяет правильность ходов по правилам шахмат
- ✅ Подсвечивает короля при шахе (оранжевый) и мате (красный)
- ✅ Автоматически записывает результат в поле ответа GetCourse
- ✅ Автоматически отправляет форму при решении всех задач

## Поддержка

Если что-то не работает:

1. Проверьте правильность FEN-кода
2. Проверьте формат ходов (без пробелов, через запятую)
3. Откройте консоль браузера (F12) для проверки ошибок
