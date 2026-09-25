// Ключи в верхнем регистре совпадают с ErrorCode (shared/errors/AppError.ts).
import { defineSection } from "./defineSection";

export const errors = defineSection({
  ru: {
    VALIDATION_FAILED: "Проверьте правильность заполнения полей",
    NOT_FOUND: "Не найдено",
    CONFLICT: "Конфликт с существующими данными",
    UNAUTHORIZED: "Войдите заново",
    INVALID_CREDENTIALS: "Неверный логин или пароль",
    RATE_LIMITED: "Слишком много попыток. Попробуйте позже.",
    FILE_TOO_LARGE: "Файл больше 1 МБ",
    UNSUPPORTED_FILE_TYPE: "Нужен PNG, JPEG или WebP",
    INTERNAL: "Что-то пошло не так",
    submitFailed: "Не удалось отправить. Попробуйте ещё раз.",
    loadFailed: "Не удалось загрузить данные",
  },
  hy: {
    VALIDATION_FAILED: "Ստուգեք դաշտերի լրացման ճշտությունը",
    NOT_FOUND: "Չի գտնվել",
    CONFLICT: "Հակասություն առկա տվյալների հետ",
    UNAUTHORIZED: "Մուտք գործեք կրկին",
    INVALID_CREDENTIALS: "Սխալ մուտքանուն կամ գաղտնաբառ",
    RATE_LIMITED: "Չափազանց շատ փորձեր։ Փորձեք մի փոքր ուշ։",
    FILE_TOO_LARGE: "Ֆայլը 1 ՄԲ-ից մեծ է",
    UNSUPPORTED_FILE_TYPE: "Անհրաժեշտ է PNG, JPEG կամ WebP",
    INTERNAL: "Ինչ-որ բան սխալ գնաց",
    submitFailed: "Չհաջողվեց ուղարկել։ Փորձեք կրկին։",
    loadFailed: "Չհաջողվեց բեռնել տվյալները",
  },
  en: {
    VALIDATION_FAILED: "Check the form fields",
    NOT_FOUND: "Not found",
    CONFLICT: "Conflict with existing data",
    UNAUTHORIZED: "Please sign in again",
    INVALID_CREDENTIALS: "Wrong login or password",
    RATE_LIMITED: "Too many attempts. Try again later.",
    FILE_TOO_LARGE: "File is larger than 1 MB",
    UNSUPPORTED_FILE_TYPE: "PNG, JPEG or WebP required",
    INTERNAL: "Something went wrong",
    submitFailed: "Could not send. Please try again.",
    loadFailed: "Failed to load data",
  },
});
