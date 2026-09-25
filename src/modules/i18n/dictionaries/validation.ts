import { defineSection } from "./defineSection";

export const validation = defineSection({
  ru: { tooShort: "Слишком коротко", tooLong: "Слишком длинно", required: "Обязательное поле", periodOrder: "Дата «по» раньше даты «с»", periodFuture: "Дата «по» не может быть в будущем", invalidEmail: "Неверный email", invalidPhone: "Неверный телефон", invalidNumber: "Нужно число" },
  hy: { tooShort: "Չափազանց կարճ է", tooLong: "Չափազանց երկար է", required: "Պարտադիր դաշտ", periodOrder: "«Մինչև» ամսաթիվը «Սկսած»-ից շուտ է", periodFuture: "«Մինչև» ամսաթիվը չի կարող լինել ապագայում", invalidEmail: "Սխալ էլ. փոստ", invalidPhone: "Սխալ հեռախոսահամար", invalidNumber: "Անհրաժեշտ է թիվ" },
  en: { tooShort: "Too short", tooLong: "Too long", required: "Required field", periodOrder: "“To” date is before “From”", periodFuture: "“To” date cannot be in the future", invalidEmail: "Invalid email", invalidPhone: "Invalid phone number", invalidNumber: "Must be a number" },
});
