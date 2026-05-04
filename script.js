const menuButton = document.querySelector(".menu-button");
const mainNav = document.querySelector(".main-nav");
const navPlaceholder = document.createComment("main-nav-placeholder");

mainNav?.after(navPlaceholder);

const mobileMenuQuery = window.matchMedia("(max-width: 920px)");

const updateMobileMenuTop = () => {
  const header = document.querySelector(".site-header");
  const headerBottom = header?.getBoundingClientRect().bottom ?? 68;
  document.documentElement.style.setProperty("--mobile-menu-top", `${Math.max(headerBottom + 10, 74)}px`);
};

const syncNavPlacement = () => {
  if (!mainNav || !navPlaceholder.parentNode) return;

  const shouldFloat = mobileMenuQuery.matches && mainNav.classList.contains("open");

  if (shouldFloat && mainNav.parentNode !== document.body) {
    document.body.appendChild(mainNav);
    return;
  }

  if (!shouldFloat && mainNav.parentNode !== navPlaceholder.parentNode) {
    navPlaceholder.parentNode.insertBefore(mainNav, navPlaceholder);
  }
};

const closeMenu = () => {
  mainNav?.classList.remove("open");
  menuButton?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
  syncNavPlacement();
};

menuButton?.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("menu-open", isOpen);

  if (isOpen) {
    updateMobileMenuTop();
  }

  syncNavPlacement();
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", () => {
    closeMenu();
  });
});

window.addEventListener("resize", () => {
  if (!mobileMenuQuery.matches) {
    closeMenu();
    return;
  }

  if (mainNav?.classList.contains("open")) {
    updateMobileMenuTop();
    syncNavPlacement();
  }
});

const extraCards = Array.from(document.querySelectorAll(".extras-grid article"));
const extraCardsQuery = window.matchMedia("(max-width: 760px)");

const closeExtraCards = (exceptCard = null) => {
  extraCards.forEach((card) => {
    if (card !== exceptCard) {
      card.classList.remove("is-open");
      card.setAttribute("aria-expanded", "false");
    }
  });
};

extraCards.forEach((card) => {
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-expanded", "false");

  card.addEventListener("click", (event) => {
    if (!extraCardsQuery.matches) return;

    event.preventDefault();
    const shouldOpen = !card.classList.contains("is-open");
    closeExtraCards(card);
    card.classList.toggle("is-open", shouldOpen);
    card.setAttribute("aria-expanded", String(shouldOpen));
  });

  card.addEventListener("keydown", (event) => {
    if (!extraCardsQuery.matches || (event.key !== "Enter" && event.key !== " ")) return;

    event.preventDefault();
    card.click();
  });
});

document.addEventListener("click", (event) => {
  if (!extraCardsQuery.matches || event.target.closest(".extras-grid article")) return;

  closeExtraCards();
});

window.addEventListener("resize", () => {
  if (!extraCardsQuery.matches) {
    closeExtraCards();
  }
});

const calculator = document.querySelector(".calculator-card");
const state = {
  rooms: 0,
  type: 0,
};

const roomOptions = ["1-комнатная", "2-комнатная", "3-комнатная", "4-комнатная", "5-комнатная"];
const cleaningOptions = ["Регулярная", "Генеральная", "После ремонта"];
const prices = [
  [2950, 5900, 7500],
  [3900, 7300, 9300],
  [4900, 8500, 11000],
  [5900, 9900, 12900],
  [6900, 11500, 14900],
];

const formatPrice = (value) => `${value.toLocaleString("ru-RU")} ₽`;

const updateCalculator = () => {
  if (!calculator) return;

  const roomsOutput = calculator.querySelector('[data-value="rooms"]');
  const typeOutput = calculator.querySelector('[data-value="type"]');
  const priceOutput = calculator.querySelector("[data-price]");

  roomsOutput.textContent = roomOptions[state.rooms];
  typeOutput.textContent = cleaningOptions[state.type];
  priceOutput.textContent = formatPrice(prices[state.rooms][state.type]);

  calculator.querySelectorAll("[data-stepper]").forEach((stepper) => {
    stepper.classList.remove("at-start", "at-end");
    stepper.querySelectorAll(".stepper-button").forEach((button) => {
      button.disabled = false;
    });
  });
};

calculator?.querySelectorAll(".stepper-button").forEach((button) => {
  button.addEventListener("click", () => {
    const stepper = button.closest("[data-stepper]");
    const key = stepper.dataset.stepper;
    const max = key === "rooms" ? roomOptions.length - 1 : cleaningOptions.length - 1;
    const nextValue = state[key] + Number(button.dataset.direction);

    state[key] = (nextValue + max + 1) % (max + 1);
    updateCalculator();
  });
});

calculator?.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const phoneInput = form.querySelector('input[name="phone"]');
  const previousText = button.textContent;
  const phone = phoneInput.value.trim();

  if (phone.length < 7) {
    phoneInput.focus();
    button.textContent = "Введите телефон";
    setTimeout(() => {
      button.textContent = previousText;
    }, 1800);
    return;
  }

  button.disabled = true;
  button.textContent = "Отправляем...";

  fetch("/api/order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone,
      rooms: roomOptions[state.rooms],
      cleaningType: cleaningOptions[state.type],
      price: formatPrice(prices[state.rooms][state.type]),
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Не удалось отправить заявку");
      }

      button.textContent = "Заявка отправлена";
      form.reset();
    })
    .catch((error) => {
      console.error("CleanStory order error:", error);
      button.textContent = "Ошибка отправки";
    })
    .finally(() => {
      setTimeout(() => {
        button.disabled = false;
        button.textContent = previousText;
      }, 2200);
    });
});

updateCalculator();

const counterDigits = document.querySelector("[data-counter-start]");

const setCounterValue = (counter, value) => {
  const digits = Array.from(counter.querySelectorAll("[data-digit]"));
  const valueText = String(value).padStart(digits.length, "0").slice(-digits.length);

  digits.forEach((digit, index) => {
    const nextValue = valueText[index];
    if (digit.textContent === nextValue) return;

    digit.textContent = nextValue;
    if (counter.dataset.ready === "true") {
      digit.classList.remove("is-flipping");
      digit.offsetHeight;
      digit.classList.add("is-flipping");
    }
  });
};

const animateCounter = (counter) => {
  if (counter.dataset.animated === "true") return;

  counter.dataset.animated = "true";
  let currentValue = Number(counter.dataset.counterStart || 10000);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  setCounterValue(counter, currentValue);
  counter.dataset.ready = "true";

  if (reducedMotion) {
    return;
  }

  const step = () => {
    const nextValue = currentValue + 10 + Math.floor(Math.random() * 16);
    const startedAt = performance.now();
    const duration = 2200;

    const tick = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(currentValue + (nextValue - currentValue) * eased);

      setCounterValue(counter, value);

      if (progress < 1) {
        requestAnimationFrame(tick);
        return;
      }

      currentValue = nextValue;
      scheduleNextStep();
    };

    requestAnimationFrame(tick);
  };

  const scheduleNextStep = () => {
    setTimeout(step, 5800 + Math.floor(Math.random() * 1800));
  };

  scheduleNextStep();
};

if (counterDigits) {
  if ("IntersectionObserver" in window) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.45 }
    );

    counterObserver.observe(counterDigits);
  } else {
    animateCounter(counterDigits);
  }
}

const matrixData = {
  rooms: [
    ["Заправляем кровать", true, true, true],
    ["Собираем мусор и меняем мешки", true, true, true],
    ["Меняем мусорные мешки в корзинах", true, true, true],
    ["Раскладываем аккуратно вещи", true, true, true],
    ["Протираем пыль на всех доступных и свободных поверхностях", true, true, true],
    ["Протираем от пыли торшеры и настенные бра", true, true, true],
    ["Протираем от пыли подоконники", true, true, true],
    ["Моем дверные ручки", true, true, true],
    ["Моем зеркала и зеркальные поверхности", true, true, true],
    ["Пылесосим пол", true, true, true],
    ["Моем пол и плинтуса", true, true, true],
    ["Моем шкафы и тумбы внутри при условии, что они пустые", false, true, true],
    ["Моем шкафы сверху", false, true, true],
    ["Протираем от пыли все крупные предметы", false, true, true],
    ["Моем радиаторы отопления", false, true, true],
    ["Отодвигаем легкую мебель при мытье пола", false, true, true],
    ["Снимаем защитную пленку и чехлы с мебели", false, false, true],
    ["Снимаем скотч", false, false, true],
    ["Избавляем от строительной пыли потолок, стены и пол", false, false, true],
    ["Избавляем мебель от строительной пыли", false, false, true],
    ["Оттираем следы и капли краски, штукатурки, затирки, клея", false, false, true],
  ],
  kitchen: [
    ["Собираем мусор", true, true, true],
    ["Меняем пакеты в мусорных корзинах", true, true, true],
    ["Моем грязную посуду в раковине", true, true, true],
    ["Моем плиту", true, true, true],
    ["Протираем пыль на всех доступных и свободных поверхностях", true, true, true],
    ["Протираем от пыли столешницы", false, true, true],
    ["Моем стол и стулья", true, true, true],
    ["Моем раковину и кран", true, true, true],
    ["Протираем от пыли настенные бра", true, true, true],
    ["Протираем от пыли подоконники", true, true, true],
    ["Моем дверные ручки", true, true, true],
    ["Моем зеркала и зеркальные поверхности", true, true, true],
    ["Пылесосим пол", true, true, true],
    ["Моем пол и плинтуса", true, true, true],
    ["Моем двери", false, true, true],
    ["Моем мусорное ведро", false, true, true],
    ["Моем все шкафы и ящики внутри при условии, что они пустые", false, true, true],
    ["Моем шкафы сверху", false, true, true],
    ["Моем весь кухонный гарнитур", false, true, true],
    ["Отмываем жировые отложения", false, true, true],
    ["Протираем от пыли все крупные предметы", false, true, true],
    ["Моем радиаторы отопления", false, true, true],
    ["Моем розетки/выключатели", false, true, true],
    ["Отодвигаем легкую мебель при мытье пола", false, true, true],
    ["Снимаем защитную пленку и чехлы с мебели", false, false, true],
    ["Снимаем скотч", false, false, true],
    ["Избавляем от строительной пыли потолок, стены и пол", false, false, true],
    ["Избавляем мебель от строительной пыли", false, false, true],
    ["Оттираем следы и капли краски, штукатурки, затирки, клея", false, false, true],
  ],
  bathroom: [
    ["Собираем весь мусор", true, true, true],
    ["Меняем пакеты в мусорных корзинах", true, true, true],
    ["Раскладываем/развешиваем вещи аккуратно", true, true, true],
    ["Протираем пыль на всех доступных и свободных поверхностях", true, true, true],
    ["Протираем от пыли батарею", true, true, true],
    ["Протираем от пыли держатели", true, true, true],
    ["Протираем от пыли настенные бра", true, true, true],
    ["Моем и дезинфицируем унитаз", true, true, true],
    ["Натираем до блеска сантехнику", true, true, true],
    ["Моем и дезинфицируем раковину", true, true, true],
    ["Моем и дезинфицируем ванную/душевую кабину", true, true, true],
    ["Моем краны и душевые лейки", true, true, true],
    ["Моем мыльницу и стаканы под щетки", true, true, true],
    ["Моем дверные ручки и замок", true, true, true],
    ["Моем зеркала и зеркальные поверхности", true, true, true],
    ["Пылесосим пол", true, true, true],
    ["Моем пол и плинтуса", true, true, true],
    ["Моем розетки/выключатели", false, true, true],
    ["Моем шкафы внутри при условии, что они пустые", false, true, true],
    ["Моем шкафы сверху", false, true, true],
    ["Моем настенный кафель", false, true, true],
    ["Протираем от пыли все мелкие и крупные предметы", false, true, true],
    ["Снимаем защитную пленку и чехлы с мебели", false, false, true],
    ["Снимаем скотч", false, false, true],
    ["Избавляем от строительной пыли потолок, стены и пол", false, false, true],
    ["Избавляем мебель от строительной пыли", false, false, true],
    ["Оттираем следы и капли краски, штукатурки, затирки", false, false, true],
  ],
  hall: [
    ["Собираем весь мусор", true, true, true],
    ["Меняем пакеты в мусорных корзинах", true, true, true],
    ["Раскладываем/развешиваем вещи аккуратно", true, true, true],
    ["Протираем пыль на всех доступных и свободных поверхностях", true, true, true],
    ["Протираем от пыли настенные бра", true, true, true],
    ["Моем дверные ручки", true, true, true],
    ["Моем зеркала и зеркальные поверхности", true, true, true],
    ["Пылесосим коврик и пол", true, true, true],
    ["Моем пол и плинтуса", true, true, true],
    ["Аккуратно расставляем обувь", false, true, true],
    ["Моем все шкафы и ящики при условии, что они пустые", false, true, true],
    ["Моем двери", false, true, true],
    ["Моем розетки/выключатели", false, true, true],
    ["Протираем от пыли все мелкие и крупные предметы", false, true, true],
    ["Снимаем защитную пленку и чехлы с мебели", false, false, true],
    ["Снимаем скотч", false, false, true],
    ["Избавляем от строительной пыли потолок, стены и пол", false, false, true],
    ["Избавляем мебель от строительной пыли", false, false, true],
    ["Оттираем следы и капли краски, штукатурки, затирки", false, false, true],
  ],
};

const renderMatrix = (zone = "rooms") => {
  const body = document.querySelector("[data-matrix-body]");
  if (!body) return;

  body.innerHTML = matrixData[zone]
    .map(
      ([service, regular, general, repair]) => `
        <div class="matrix-row" role="row">
          <span class="matrix-service" role="cell">${service}</span>
          <span role="cell"><i class="matrix-mark ${regular ? "yes" : "no"}">${regular ? "✓" : "×"}</i></span>
          <span role="cell"><i class="matrix-mark ${general ? "yes" : "no"}">${general ? "✓" : "×"}</i></span>
          <span role="cell"><i class="matrix-mark ${repair ? "yes" : "no"}">${repair ? "✓" : "×"}</i></span>
        </div>`
    )
    .join("");
};

document.querySelectorAll("[data-zone]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-zone]").forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-selected", String(isActive));
    });

    renderMatrix(button.dataset.zone);
  });
});

renderMatrix();

const reviewCarousel = document.querySelector("[data-review-carousel]");

if (reviewCarousel) {
  const track = reviewCarousel.querySelector("[data-review-track]");
  const prevButton = reviewCarousel.querySelector("[data-review-prev]");
  const nextButton = reviewCarousel.querySelector("[data-review-next]");
  const originalCards = Array.from(track.children);
  let activeIndex = originalCards.length;

  originalCards
    .map((card) => card.cloneNode(true))
    .reverse()
    .forEach((card) => track.prepend(card));
  originalCards.forEach((card) => track.append(card.cloneNode(true)));
  const cards = Array.from(track.children);

  const updateReviews = () => {
    const activeCard = cards[activeIndex];
    const cardWidth = activeCard.getBoundingClientRect().width;
    const viewportWidth = reviewCarousel.querySelector(".review-viewport").getBoundingClientRect().width;
    const offset = activeCard.offsetLeft - (viewportWidth - cardWidth) / 2;

    track.style.transform = `translateX(${-offset}px)`;
    cards.forEach((card, index) => {
      const isActive = index === activeIndex;
      const isPrev = index === activeIndex - 1;
      const isNext = index === activeIndex + 1;

      card.classList.toggle("is-active", isActive);
      card.classList.toggle("is-neighbor", isPrev || isNext);
      card.classList.toggle("is-prev", isPrev);
      card.classList.toggle("is-next", isNext);
    });
  };

  const jumpWithoutAnimation = (index) => {
    track.style.transition = "none";
    activeIndex = index;
    updateReviews();
    track.offsetHeight;
    track.style.transition = "";
  };

  const goToReview = (direction) => {
    activeIndex += direction;
    updateReviews();

    if (activeIndex >= originalCards.length * 2) {
      setTimeout(() => jumpWithoutAnimation(originalCards.length), 430);
    }

    if (activeIndex < originalCards.length) {
      setTimeout(() => jumpWithoutAnimation(originalCards.length * 2 - 1), 430);
    }
  };

  prevButton.addEventListener("click", () => {
    goToReview(-1);
  });

  nextButton.addEventListener("click", () => {
    goToReview(1);
  });

  window.addEventListener("resize", updateReviews);

  updateReviews();
}

const workCarousel = document.querySelector("[data-work-carousel]");

if (workCarousel) {
  const slides = Array.from(workCarousel.querySelectorAll(".work-slide"));
  const prevButton = workCarousel.querySelector("[data-work-prev]");
  const nextButton = workCarousel.querySelector("[data-work-next]");
  let activeIndex = 0;

  function showWorkSlide(index) {
    activeIndex = (index + slides.length) % slides.length;
    const prevIndex = (activeIndex - 1 + slides.length) % slides.length;
    const nextIndex = (activeIndex + 1) % slides.length;

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("active", slideIndex === activeIndex);
      slide.classList.toggle("is-prev", slideIndex === prevIndex);
      slide.classList.toggle("is-next", slideIndex === nextIndex);
    });
  }

  prevButton.addEventListener("click", () => showWorkSlide(activeIndex - 1));
  nextButton.addEventListener("click", () => showWorkSlide(activeIndex + 1));

  workCarousel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") showWorkSlide(activeIndex - 1);
    if (event.key === "ArrowRight") showWorkSlide(activeIndex + 1);
  });

  workCarousel.tabIndex = 0;
  showWorkSlide(0);
}
