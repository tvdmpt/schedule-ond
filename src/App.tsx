import { useEffect, useMemo, useState } from "react";

type DayWish = {
  off: boolean;
  from: string;
  to: string;
  late: boolean;
};

type Employee = {
  id: number;
  surname: string;
  first_name: string;
  hourly_rate: number;
};

type Wish = {
  employee_id: number;
  surname: string;
  first_name: string;
  hourly_rate: number;
  days: DayWish[];
  restriction_text: string;
  updated_at: string;
};

type Assignment = {
  point: string;
  employee_id: number;
  from: string;
  to: string;
};

const POINTS = [
  "Верхние Котлы-01",
  "Верхние Котлы-03",
  "ЗИЛ",
];

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const blankDays = (): DayWish[] =>
  Array.from({ length: 7 }, () => ({
    off: false,
    from: "07:00",
    to: "22:00",
    late: false,
  }));

function nextMonday() {
  const d = new Date();
  const shift = (8 - (d.getDay() || 7)) % 7 || 7;
  d.setDate(d.getDate() + shift);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateLabel(d: Date) {
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
}

function weekISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function hoursOf(days: DayWish[]) {
  return days.reduce((sum, x) => {
    if (x.off || !x.from || !x.to) return sum;

    const from =
      Number(x.from.slice(0, 2)) * 60 +
      Number(x.from.slice(3));

    const to =
      Number(x.to.slice(0, 2)) * 60 +
      Number(x.to.slice(3));

    return sum + Math.max(0, (to - from) / 60);
  }, 0);
}

export default function App() {
  const [profile, setProfile] = useState<{
    id: number;
    surname: string;
    first_name: string;
    hourly_rate: number;
  } | null>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("sg-profile") || "null"
      );
    } catch {
      return null;
    }
  });

  const [role, setRole] = useState<"employee" | "manager">(
    "employee"
  );

  const [surname, setSurname] = useState("");
  const [firstName, setFirstName] = useState("");
  const [rate, setRate] = useState("350");
  const [days, setDays] = useState<DayWish[]>(blankDays());
  const [restriction, setRestriction] = useState("");
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState("");
  const [managerPassword, setManagerPassword] = useState("");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [selectedDay, setSelectedDay] = useState(0);

  const [assignments, setAssignments] = useState<
    Record<string, Assignment[]>
  >({});

  const week = useMemo(() => nextMonday(), []);
  const weekStart = weekISO(week);

  const weekDates = useMemo(
    () =>
      DAY_NAMES.map((_, i) => {
        const d = new Date(week);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [week]
  );

  const totalHours = hoursOf(days);

  const complete = days.every(
    (x) =>
      x.off ||
      (
        Boolean(x.from) &&
        Boolean(x.to) &&
        x.from < x.to &&
        x.from >= "07:00" &&
        x.to <= "22:00"
      )
  );

  const show = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  };

  const localMode = import.meta.env.DEV;

  function readLocal(key: string, fallback: any) {
    try {
      return (
        JSON.parse(localStorage.getItem("sg-" + key) || "null") ??
        fallback
      );
    } catch {
      return fallback;
    }
  }

  async function api(path: string, init?: RequestInit): Promise<any> {
    if (localMode) {
      const body = init?.body
        ? JSON.parse(String(init.body))
        : {};

      if (path === "/api/profile") {
        const storedEmployees = readLocal("employees", []);

        const employee = {
          id: Date.now(),
          surname: body.surname,
          first_name: body.first_name,
          hourly_rate: Number(body.hourly_rate) || 0,
        };

        storedEmployees.push(employee);

        localStorage.setItem(
          "sg-employees",
          JSON.stringify(storedEmployees)
        );

        return { employee };
      }

      if (path === "/api/wishes") {
        const storedWishes = readLocal("wishes", []);

        const item = {
          ...body,
          updated_at: new Date().toISOString(),
        };

        const next = [
          ...storedWishes.filter(
            (x: any) =>
              !(
                x.employee_id === body.employee_id &&
                x.week_start === body.week_start
              )
          ),
          item,
        ];

        localStorage.setItem(
          "sg-wishes",
          JSON.stringify(next)
        );

        return { ok: true };
      }

      if (path === "/api/manager-auth") {
        if (!body.password) {
          throw new Error("Введите пароль менеджера");
        }

        return { ok: true };
      }

      if (path === "/api/manager") {
        return {
          employees: readLocal("employees", []),
          wishes: readLocal("wishes", []),
        };
      }

      if (path === "/api/assignments") {
        const all = readLocal("assignments", []);

        localStorage.setItem(
          "sg-assignments",
          JSON.stringify([
            ...all.filter(
              (x: any) => x.work_date !== body.work_date
            ),
            body,
          ])
        );

        return { ok: true };
      }
    }

    let response: Response;

    try {
      response = await fetch(path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
      });
    } catch {
      throw new Error(
        "Не удалось связаться с сервером. Проверьте подключение и настройки Vercel/Neon."
      );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || `Ошибка сервера (${response.status})`
      );
    }

    return data;
  }

  async function createProfile() {
    if (!surname.trim() || !firstName.trim()) {
      return show("Введите фамилию и имя");
    }

    try {
      const data = await api("/api/profile", {
        method: "POST",
        body: JSON.stringify({
          surname: surname.trim(),
          first_name: firstName.trim(),
          hourly_rate: Number(rate) || 0,
        }),
      });

      const p = {
        id: data.employee.id,
        surname: data.employee.surname,
        first_name: data.employee.first_name,
        hourly_rate: Number(data.employee.hourly_rate),
      };

      setProfile(p);
      localStorage.setItem("sg-profile", JSON.stringify(p));
      show("Профиль сохранён");
    } catch (e) {
      show(
        e instanceof Error
          ? e.message
          : "Не удалось сохранить профиль"
      );
    }
  }

  async function submitWishes() {
    if (!profile) return;

    if (!complete) {
      return show("Проверьте интервалы: 07:00–22:00");
    }

    try {
      await api("/api/wishes", {
        method: "POST",
        body: JSON.stringify({
          employee_id: profile.id,
          week_start: weekStart,
          days,
          restriction_text: restriction,
          hourly_rate: Number(rate) || 0,
        }),
      });

      setSent(true);
      show("Пожелания отправлены");
    } catch (e) {
      show(
        e instanceof Error
          ? e.message
          : "Не удалось отправить пожелания"
      );
    }
  }

  async function loadManager() {
    try {
      const data = await api("/api/manager");

      setEmployees(data.employees || []);
      setWishes(data.wishes || []);
    } catch (e) {
      show(
        e instanceof Error
          ? e.message
          : "Не удалось загрузить данные"
      );
    }
  }

  async function enterManager() {
    try {
      await api("/api/manager-auth", {
        method: "POST",
        body: JSON.stringify({
          password: managerPassword,
        }),
      });

      setRole("manager");
      await loadManager();
    } catch (e) {
      show(
        e instanceof Error
          ? e.message
          : "Доступ запрещён"
      );
    }
  }

  async function saveAssignment() {
    const rows = assignments[String(selectedDay)] || [];

    try {
      await api("/api/assignments", {
        method: "POST",
        body: JSON.stringify({
          week_start: weekStart,
          work_date: weekISO(weekDates[selectedDay]),
          assignments: rows,
        }),
      });

      show("Назначения сохранены");
    } catch (e) {
      show(
        e instanceof Error
          ? e.message
          : "Не удалось сохранить"
      );
    }
  }

  useEffect(() => {
    if (profile) {
      setRate(String(profile.hourly_rate || 350));
    }
  }, [profile]);

  const updateDay = (
    i: number,
    patch: Partial<DayWish>
  ) => {
    setDays((old) =>
      old.map((d, n) =>
        n === i ? { ...d, ...patch } : d
      )
    );
  };

  const addAssignment = (
    point: string,
    employee_id: number,
    from: string,
    to: string
  ) => {
    const key = String(selectedDay);

    setAssignments((old) => ({
      ...old,
      [key]: [
        ...(old[key] || []).filter(
          (x) => x.point !== point
        ),
        ...(employee_id
          ? [{ point, employee_id, from, to }]
          : []),
      ],
    }));
  };

  const assigned = assignments[String(selectedDay)] || [];

  const overlapping = assigned.some((a, i) =>
    assigned.slice(i + 1).some(
      (b) =>
        a.employee_id === b.employee_id &&
        a.from < b.to &&
        b.from < a.to
    )
  );

  return (
    <main className="app">
      <header className="top">
        <div className="brand">Schedule</div>
        <div className="pill">МОСКВА · 07:00–22:00</div>
      </header>

      {notice && <div className="toast">{notice}</div>}

      {!profile ? (
        <section className="glass panel welcome">
          <div className="eyebrow">ПЕРВЫЙ ВХОД</div>
          <h2>Создать профиль</h2>

          <div className="field">
            <label>Фамилия</label>
            <input
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              placeholder="Иванов"
            />
          </div>

          <div className="field">
            <label>Имя</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Иван"
            />
          </div>

          <div className="field">
            <label>Ставка, ₽/час</label>
            <input
              type="number"
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>

          <button className="primary" onClick={createProfile}>
            Продолжить
          </button>
        </section>
      ) : role === "employee" ? (
        <>
          <section className="hero">
            <div className="eyebrow">КАБИНЕТ СОТРУДНИКА</div>
            <h1>
              Привет,
              <br />
              <span>{profile.first_name}.</span>
            </h1>
            <p>
              Заполните доступность на следующую неделю.
              Пожелания отправляются после заполнения всех семи дней.
            </p>
          </section>

          <section className="glass panel summary">
            <div>
              <small>ЧАСЫ ЗА НЕДЕЛЮ</small>
              <strong>{totalHours} ч</strong>
            </div>

            <div>
              <small>ОПЛАТА ЗА НЕДЕЛЮ</small>
              <strong>
                {Math.round(
                  totalHours * (Number(rate) || 0)
                ).toLocaleString("ru-RU")}{" "}
                ₽
              </strong>
            </div>

            <div className="field">
              <label>Ставка, ₽/час</label>
              <input
                type="number"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <div>
                <div className="eyebrow">СЛЕДУЮЩАЯ НЕДЕЛЯ</div>
                <h2>
                  {dateLabel(weekDates[0])} —{" "}
                  {dateLabel(weekDates[6])}
                </h2>
              </div>

              <span className="pill">7 ДНЕЙ</span>
            </div>

            <div className="days">
              {days.map((d, i) => (
                <article className="day" key={i}>
                  <small>{dateLabel(weekDates[i])}</small>
                  <b>{DAY_NAMES[i]}</b>

                  <label className="check">
                    <input
                      type="checkbox"
                      checked={d.off}
                      onChange={(e) =>
                        updateDay(i, {
                          off: e.target.checked,
                        })
                      }
                    />
                    Выходной
                  </label>

                  {!d.off && (
                    <div className="times">
                      <label>
                        С
                        <input
                          type="time"
                          min="07:00"
                          max="22:00"
                          value={d.from}
                          onChange={(e) =>
                            updateDay(i, {
                              from: e.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        До
                        <input
                          type="time"
                          min="07:00"
                          max="22:00"
                          value={d.to}
                          onChange={(e) =>
                            updateDay(i, {
                              to: e.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                  )}

                  <label className="check">
                    <input
                      type="checkbox"
                      checked={d.late}
                      onChange={(e) =>
                        updateDay(i, {
                          late: e.target.checked,
                        })
                      }
                    />
                    +1 час
                  </label>
                </article>
              ))}
            </div>

            <div className="glass panel extra">
              <label>
                Дополнительные ограничения (необязательно)
              </label>
              <textarea
                value={restriction}
                onChange={(e) =>
                  setRestriction(e.target.value)
                }
                placeholder="Например, в среду могу только после 12:00"
              />
            </div>

            <div className="row">
              <button
                className="primary"
                disabled={!complete}
                onClick={submitWishes}
              >
                {sent ? "Обновить пожелания" : "Отправить пожелания"}
              </button>

              <span className="muted">
                {sent
                  ? "Отправлено"
                  : complete
                  ? "Все 7 дней заполнены"
                  : "Заполните каждый день"}
              </span>
            </div>

            <p className="footnote">
              Дедлайн — суббота 00:00 по Москве. +1 час не
              добавляется к расчёту автоматически. Профиль
              сохранён на этом устройстве.
            </p>
          </section>

          <section className="section">
            <button
              className="ghost"
              onClick={() => {
                setManagerPassword("");
                document
                  .getElementById("manager")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Вход для менеджера
            </button>

            <div
              id="manager"
              className="glass panel manager-login"
            >
              <div className="field">
                <label>Пароль менеджера</label>
                <input
                  type="password"
                  value={managerPassword}
                  onChange={(e) =>
                    setManagerPassword(e.target.value)
                  }
                />
              </div>

              <button onClick={enterManager}>Войти</button>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="hero">
            <div className="eyebrow">ПАНЕЛЬ МЕНЕДЖЕРА</div>
            <h1>
              Команда
              <br />
              <span>и график.</span>
            </h1>
          </section>

          <div className="tabs">
            <button className="active">Пожелания</button>
            <button onClick={loadManager}>Обновить</button>
            <button onClick={() => setRole("employee")}>
              Выйти
            </button>
          </div>

          <section className="glass panel">
            <div className="section-head">
              <h2>Пожелания сотрудников</h2>
              <span className="pill">
                {wishes.length} отправлено
              </span>
            </div>

            {wishes.length === 0 ? (
              <p className="muted">
                Пока нет отправленных пожеланий.
              </p>
            ) : (
              wishes.map((w) => (
                <div className="wish" key={w.employee_id}>
                  <b>
                    {w.surname} {w.first_name}
                  </b>

                  <span>
                    {w.days
                      .map(
                        (d, i) =>
                          `${DAY_NAMES[i]}: ${
                            d.off
                              ? "выходной"
                              : d.from + "–" + d.to
                          }`
                      )
                      .join(" · ")}
                  </span>

                  <small>{w.restriction_text}</small>
                </div>
              ))
            )}
          </section>

          <section className="glass panel section">
            <div className="section-head">
              <h2>Распределение по точкам</h2>
              <span className="pill">07:00–22:00</span>
            </div>

            <label className="field">
              <span>День недели</span>
              <select
                value={selectedDay}
                onChange={(e) =>
                  setSelectedDay(Number(e.target.value))
                }
              >
                {DAY_NAMES.map((d, i) => (
                  <option value={i} key={i}>
                    {d} · {dateLabel(weekDates[i])}
                  </option>
                ))}
              </select>
            </label>

            {POINTS.map((point) => (
              <div className="assignment-row" key={point}>
                <strong>{point}</strong>

                <select
                  value={
                    assigned.find((x) => x.point === point)
                      ?.employee_id || ""
                  }
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    addAssignment(
                      point,
                      id,
                      "07:00",
                      "22:00"
                    );
                  }}
                >
                  <option value="">Не назначен</option>

                  {employees.map((employee) => (
                    <option
                      key={employee.id}
                      value={employee.id}
                    >
                      {employee.surname} {employee.first_name}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {overlapping && (
              <p className="warning">
                Один сотрудник назначен одновременно на несколько
                точек.
              </p>
            )}

            <button
              className="primary"
              onClick={saveAssignment}
            >
              Сохранить назначения
            </button>

            <p className="footnote">
              Это базовое распределение: для нескольких смен и
              параллельных сотрудников на одной точке потребуется
              расширить редактор графика.
            </p>
          </section>
        </>
      )}
    </main>
  );
}