/**
 * @jest-environment jsdom
 */

import { screen, fireEvent, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import mockStore from "../__mocks__/store.js";
import router from "../app/Router.js";
import { ROUTES_PATH } from "../constants/routes.js";

jest.mock("../app/Store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    beforeEach(() => {
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: jest.fn(() =>
            JSON.stringify({
              type: "Employee",
              email: "employee@test.com",
            })
          ),
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
      });

      document.body.innerHTML = "";
    });

    test("Then instantiate NewBill and attach event listeners", () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      const mockNavigate = jest.fn();
      const mockStore = {
        bills: jest.fn(() => ({
          create: jest.fn(),
          update: jest.fn(),
        })),
      };
      const instance = new NewBill({
        document,
        onNavigate: mockNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const form = screen.getByTestId("form-new-bill");
      expect(form).toBeTruthy();

      const fileInput = screen.getByTestId("file");
      expect(fileInput).toBeTruthy();
    });

    describe("When selecting a file to upload", () => {
      test("Then upload a file with valid extension", async () => {
        const html = NewBillUI();
        document.body.innerHTML = html;

        const mockStore = {
          bills: jest.fn(() => ({
            create: jest.fn(() => Promise.resolve({ fileUrl: "https://example.com/image.png", key: "1234" })),
          })),
        };

        const instance = new NewBill({
          document,
          onNavigate: jest.fn(),
          store: mockStore,
          localStorage: window.localStorage,
        });

        const fileInput = screen.getByTestId("file");
        const file = new File(["dummy content"], "test.png", { type: "image/png" });

        Object.defineProperty(fileInput, "files", {
          value: [file],
        });

        const event = { preventDefault: jest.fn(), target: { value: "C:\\fakepath\\test.png" } };
        await instance.handleChangeFile(event);

        expect(instance.fileUrl).toBe("https://example.com/image.png");
        expect(instance.fileName).toBe("test.png");
      });

      test("Then reject file with invalid extension", () => {
        window.alert = jest.fn();

        const html = NewBillUI();
        document.body.innerHTML = html;

        const instance = new NewBill({
          document,
          onNavigate: jest.fn(),
          store: null,
          localStorage: window.localStorage,
        });

        const fileInput = screen.getByTestId("file");
        const file = new File(["test"], "test.pdf", { type: "application/pdf" });

        Object.defineProperty(fileInput, "files", {
          value: [file],
        });

        const event = { preventDefault: jest.fn(), target: { value: "C:\\fakepath\\test.pdf" } };
        instance.handleChangeFile(event);

        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Format de fichier non valide"));
        expect(fileInput.value).toBe("");
      });
    });

    describe("When submitting form", () => {
      test("Then call updateBill and navigate on form submit", async () => {
        const html = NewBillUI();
        document.body.innerHTML = html;

        const mockNavigate = jest.fn();
        const mockUpdate = jest.fn(() => Promise.resolve());
        const mockStore = {
          bills: jest.fn(() => ({
            update: mockUpdate,
          })),
        };

        const instance = new NewBill({
          document,
          onNavigate: mockNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        screen.getByTestId("expense-type").value = "Transports";
        screen.getByTestId("expense-name").value = "Billet de train";
        screen.getByTestId("amount").value = "100";
        screen.getByTestId("datepicker").value = "2023-04-01";
        screen.getByTestId("vat").value = "20";
        screen.getByTestId("pct").value = "20";
        screen.getByTestId("commentary").value = "Aller-retour Paris";

        instance.fileUrl = "https://example.com/image.png";
        instance.fileName = "image.png";
        instance.billId = "1234";

        const form = screen.getByTestId("form-new-bill");
        const submitEvent = { preventDefault: jest.fn(), target: form };
        await instance.handleSubmit(submitEvent);

        expect(mockNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
        expect(mockUpdate).toHaveBeenCalled();
      });

      describe("When I submit a valid bill form", () => {
        test("Then it should post the new bill to the mock API and navigate to Bills page", async () => {
          const createMock = jest.fn(() => Promise.resolve({ fileUrl: "https://example.com/image.png", key: "1234" }));

          const mockStore = {
            bills: jest.fn(() => ({
              create: createMock,
              update: jest.fn(() => Promise.resolve()),
            })),
          };

          const root = document.createElement("div");
          root.setAttribute("id", "root");
          document.body.append(root);
          router();

          window.onNavigate(ROUTES_PATH.NewBill);
          await waitFor(() => screen.getByTestId("form-new-bill"));

          const newBillInstance = new NewBill({
            document,
            onNavigate: window.onNavigate,
            store: mockStore,
            localStorage: window.localStorage,
          });

          const fileInput = screen.getByTestId("file");
          const file = new File(["test content"], "note.png", { type: "image/png" });

          Object.defineProperty(fileInput, "files", {
            value: [file],
          });

          fireEvent.change(fileInput);

          fireEvent.change(screen.getByTestId("expense-type"), { target: { value: "Transports" } });
          fireEvent.change(screen.getByTestId("expense-name"), { target: { value: "Taxi" } });
          fireEvent.change(screen.getByTestId("amount"), { target: { value: "45" } });
          fireEvent.change(screen.getByTestId("datepicker"), { target: { value: "2023-04-01" } });
          fireEvent.change(screen.getByTestId("vat"), { target: { value: "10" } });
          fireEvent.change(screen.getByTestId("pct"), { target: { value: "20" } });
          fireEvent.change(screen.getByTestId("commentary"), { target: { value: "Trajet client" } });

          const form = screen.getByTestId("form-new-bill");
          fireEvent.submit(form);

          await waitFor(() => {
            expect(mockStore.bills).toHaveBeenCalled();
            expect(mockStore.bills().create).toHaveBeenCalled();
            expect(screen.getByText("Mes notes de frais")).toBeTruthy();
          });
        });
      });
    });
  });
});
