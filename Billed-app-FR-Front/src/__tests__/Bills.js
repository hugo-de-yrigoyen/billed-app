/**
 * @jest-environment jsdom
 */

import {screen, waitFor} from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES_PATH} from "../constants/routes.js";
import {localStorageMock} from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js"
import router from "../app/Router.js";

jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')

      expect(windowIcon.classList.contains('active-icon')).toBe(true)
    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
    describe("When I click on 'New Bill' button", () => {
      test("Then it should navigate to NewBill page", () => {
        const onNavigate = jest.fn()
        document.body.innerHTML = `<button data-testid="btn-new-bill">New Bill</button>`
      
        const billsContainer = new (require('../containers/Bills.js').default)({
          document,
          onNavigate,
          store: null,
          localStorage: window.localStorage,
        })
      
        const button = screen.getByTestId("btn-new-bill")
        button.click()
        expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['NewBill'])
      })
    })
    describe("When I click on eye icon", () => {
      test("Then it should open a modal with the bill image", () => {
        document.body.innerHTML = `
          <div data-testid="icon-eye" data-bill-url="https://test.com/file.png"></div>
          <div id="modaleFile"><div class="modal-body"></div></div>
        `
        $.fn.modal = jest.fn()
      
        const instance = new (require('../containers/Bills.js').default)({
          document,
          onNavigate: jest.fn(),
          store: null,
          localStorage: window.localStorage,
        })
      
        const eyeIcon = screen.getByTestId("icon-eye")
        eyeIcon.click()
        expect($.fn.modal).toHaveBeenCalledWith('show')
        expect(document.querySelector(".modal-body").innerHTML).toContain('img')
      })
    })
    test("getBills should return formatted bills if data is valid", async () => {
      const storeMock = {
        bills: () => ({
          list: () => Promise.resolve([
            { id: "1", date: "2022-03-01", status: "pending", name: "Note 1" },
            { id: "2", date: "2021-12-12", status: "accepted", name: "Note 2" }
          ])
        })
      }
    
      const instance = new (require('../containers/Bills.js').default)({
        document,
        onNavigate: jest.fn(),
        store: storeMock,
        localStorage: window.localStorage,
      })
    
      const bills = await instance.getBills()
      expect(bills.length).toBe(2)
      expect(bills[0].status).toBe("En attente")
    })
    test("Then fetches bills from mock API and displays them correctly", async () => {
      Object.defineProperty(window, "localStorage", { value: localStorageMock })
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" }))

      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.appendChild(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)

      await waitFor(() => screen.getByText("Mes notes de frais"))

      expect(screen.getByText("Transports")).toBeTruthy()
      expect(screen.getByText("200 €")).toBeTruthy()
      expect(screen.getAllByTestId("icon-eye").length).toBeGreaterThan(0)
    })

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills")
        Object.defineProperty(window, "localStorage", { value: localStorageMock })
        window.localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" }))
        const root = document.createElement("div")
        root.setAttribute("id", "root")
        document.body.appendChild(root)
        router()
      })

      test("Then fetches bills and fails with 404 error message", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => Promise.reject(new Error("Erreur 404"))
          }
        })

        window.onNavigate(ROUTES_PATH.Bills)
        await new Promise(process.nextTick)
        const message = await screen.getByText(/Erreur 404/)
        expect(message).toBeTruthy()
      })

      test("Then fetches bills and fails with 500 error message", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => Promise.reject(new Error("Erreur 500"))
          }
        })

        window.onNavigate(ROUTES_PATH.Bills)
        await new Promise(process.nextTick)
        const message = await screen.getByText(/Erreur 500/)
        expect(message).toBeTruthy()
      })
    })
  })
})
