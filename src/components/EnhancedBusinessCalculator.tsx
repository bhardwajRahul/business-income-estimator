"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ArrowRight, Check, CreditCard, DollarSign, Menu, Users, X, Trash2 } from "lucide-react"
import { verifyVAT } from "@/lib/vatVerification"
import { getWiseAccountBalance } from "@/lib/wiseIntegration"
import { generateInvoice } from "@/lib/invoiceGenerator"
import { convertCurrency } from "@/lib/currencyConverter"
import { motion } from "framer-motion"

const vatRates = {
  "Austria (AT)": 20,
  "Belgium (BE)": 21,
  "Bulgaria (BG)": 20,
  "Croatia (HR)": 25,
  "Cyprus (CY)": 19,
  "Czech Republic (CZ)": 21,
  "Denmark (DK)": 25,
  "Estonia (EE)": 22,
  "Finland (FI)": 24,
  "France (FR)": 20,
  "Germany (DE)": 19,
  "Greece (GR)": 24,
  "Hungary (HU)": 27,
  "Iceland (IS)": 24,
  "Ireland (IE)": 23,
  "Italy (IT)": 22,
  "Latvia (LV)": 21,
  "Lithuania (LT)": 21,
  "Luxembourg (LU)": 17,
  "Malta (MT)": 18,
  "Netherlands (NL)": 21,
  "Norway (NO)": 25,
  "Poland (PL)": 23,
  "Portugal (PT)": 23,
  "Romania (RO)": 19,
  "Slovakia (SK)": 20,
  "Slovenia (SI)": 22,
  "Spain (ES)": 21,
  "Sweden (SE)": 25,
  "Switzerland (CH)": 8.1,
  "Turkey (TR)": 20,
  "Outside EU": 0,
}

type IncomeType = "hourly" | "daily" | "monthly" | "yearly"
type ExpenseFrequency = "monthly" | "quarterly" | "yearly" | "one-time"
type SubcontractorFrequency = "fixed" | "monthly"

interface Expense {
  name: string
  amount: number
  deductible: boolean
  frequency: ExpenseFrequency
}

export default function EnhancedBusinessCalculator() {
  const [incomeType, setIncomeType] = useState<IncomeType>("yearly")
  const [income, setIncome] = useState(50000)
  const [clientCountry, setClientCountry] = useState("Estonia (EE)")
  const [isGrossIncome, setIsGrossIncome] = useState(true)
  const [expenses, setExpenses] = useState<Expense[]>([
    { name: "Account Fee", amount: 60, deductible: true, frequency: "monthly" }
  ])
  const [subcontractorIncome, setSubcontractorIncome] = useState(0)
  const [subcontractorFrequency, setSubcontractorFrequency] = useState<SubcontractorFrequency>("monthly")
  const [vatNumber, setVatNumber] = useState("")
  const [isVatValid, setIsVatValid] = useState<boolean | null>(null)
  const [isVatLoading, setIsVatLoading] = useState(false)
  const [wiseBalance, setWiseBalance] = useState<{ currency: string; amount: number } | null>(null)
  const [isWiseLoading, setIsWiseLoading] = useState(false)
  const [isInvoiceGenerating, setIsInvoiceGenerating] = useState(false)
  const [convertedCurrency, setConvertedCurrency] = useState<string | null>(null)
  const [targetCurrency, setTargetCurrency] = useState("USD")
  const [calculations, setCalculations] = useState({
    hourlyNetIncome: 0,
    dailyNetIncome: 0,
    monthlyNetIncome: 0,
    yearlyNetIncome: 0,
    vatRate: 0,
    yearlyVAT: 0,
    isReverseVAT: false,
    totalExpenses: 0,
    deductibleExpenses: 0,
    nonDeductibleExpenses: 0,
    averageMonthlyNetIncome: 0,
    remainingAfterTaxes: 0,
    dividendIncome: 0,
  })

  useEffect(() => {
    const clientVatRate = vatRates[clientCountry as keyof typeof vatRates]
    const estonianVatRate = vatRates["Estonia (EE)"]
    const isReverseVAT = clientCountry !== "Estonia (EE)"
    
    let yearlyGrossIncome = income
    if (incomeType === "hourly") yearlyGrossIncome = income * 8 * 5 * 52
    if (incomeType === "daily") yearlyGrossIncome = income * 5 * 52
    if (incomeType === "monthly") yearlyGrossIncome = income * 12

    let yearlyNetIncome = yearlyGrossIncome
    let yearlyVAT = 0

    if (isGrossIncome) {
      const applicableVatRate = isReverseVAT ? clientVatRate : estonianVatRate
      yearlyVAT = yearlyGrossIncome * (applicableVatRate / 100)
      yearlyNetIncome = yearlyGrossIncome - yearlyVAT
    } else {
      const applicableVatRate = isReverseVAT ? clientVatRate : estonianVatRate
      yearlyGrossIncome = yearlyNetIncome / (1 - applicableVatRate / 100)
      yearlyVAT = yearlyGrossIncome - yearlyNetIncome
    }

    const totalExpenses = expenses.reduce((sum, exp) => {
      let annualAmount = exp.amount
      if (exp.frequency === "monthly") annualAmount *= 12
      if (exp.frequency === "quarterly") annualAmount *= 4
      return sum + annualAmount
    }, 0)

    const subcontractorAnnualIncome = subcontractorFrequency === "monthly" ? subcontractorIncome * 12 : subcontractorIncome

    const deductibleExpenses = expenses
      .filter(exp => exp.deductible)
      .reduce((sum, exp) => {
        let annualAmount = exp.amount
        if (exp.frequency === "monthly") annualAmount *= 12
        if (exp.frequency === "quarterly") annualAmount *= 4
        return sum + annualAmount
      }, 0) + subcontractorAnnualIncome

    const nonDeductibleExpenses = totalExpenses + subcontractorAnnualIncome - deductibleExpenses

    const yearlyNetAfterExpenses = yearlyNetIncome - totalExpenses - subcontractorAnnualIncome
    const corporateTax = Math.max(0, yearlyNetAfterExpenses * 0.2)
    const remainingAfterTaxes = yearlyNetAfterExpenses - corporateTax

    const dividendTax = remainingAfterTaxes * 0.07
    const dividendIncome = remainingAfterTaxes - dividendTax

    setCalculations({
      hourlyNetIncome: yearlyNetIncome / (52 * 5 * 8),
      dailyNetIncome: yearlyNetIncome / (52 * 5),
      monthlyNetIncome: yearlyNetIncome / 12,
      yearlyNetIncome,
      vatRate: isReverseVAT ? clientVatRate : estonianVatRate,
      yearlyVAT,
      isReverseVAT,
      totalExpenses: totalExpenses + subcontractorAnnualIncome,
      deductibleExpenses,
      nonDeductibleExpenses,
      averageMonthlyNetIncome: (yearlyNetIncome - totalExpenses - subcontractorAnnualIncome) / 12,
      remainingAfterTaxes,
      dividendIncome,
    })
  }, [income, incomeType, clientCountry, isGrossIncome, expenses, subcontractorIncome, subcontractorFrequency])

  const addExpense = () => {
    setExpenses([...expenses, { name: "", amount: 0, deductible: false, frequency: "monthly" }])
  }

  const deleteExpense = (index: number) => {
    const newExpenses = expenses.filter((_, i) => i !== index)
    setExpenses(newExpenses)
  }

  const handleVatVerification = async () => {
    setIsVatLoading(true)
    try {
      const isValid = await verifyVAT(vatNumber)
      setIsVatValid(isValid)
    } catch (error) {
      console.error("Error verifying VAT:", error)
      setIsVatValid(false)
    } finally {
      setIsVatLoading(false)
    }
  }

  const handleWiseBalanceCheck = async () => {
    setIsWiseLoading(true)
    try {
      const balance = await getWiseAccountBalance()
      setWiseBalance(balance)
    } catch (error) {
      console.error("Error fetching Wise balance:", error)
      setWiseBalance(null)
    } finally {
      setIsWiseLoading(false)
    }
  }

  const handleInvoiceGeneration = async () => {
    setIsInvoiceGenerating(true)
    try {
      const invoiceData = {
        companyName: "Your Company Name",
        companyAddress: "Your Company Address",
        clientName: "Client Name",
        clientAddress: "Client Address",
        invoiceNumber: "INV-001",
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [
          {
            description: "Services",
            quantity: 1,
            unitPrice: calculations.monthlyNetIncome,
            total: calculations.monthlyNetIncome,
          },
        ],
        subtotal: calculations.monthlyNetIncome,
        tax: calculations.yearlyVAT / 12,
        total: calculations.monthlyNetIncome + (calculations.yearlyVAT / 12),
      }
      const pdfUrl = await generateInvoice(invoiceData)
      window.open(pdfUrl, '_blank')
    } catch (error) {
      console.error("Error generating invoice:", error)
    } finally {
      setIsInvoiceGenerating(false)
    }
  }

  const handleCurrencyConversion = async () => {
    try {
      const convertedAmount = await convertCurrency(calculations.yearlyNetIncome, "EUR", targetCurrency)
      setConvertedCurrency(`${convertedAmount} ${targetCurrency}`)
    } catch (error) {
      console.error("Error converting currency:", error)
      setConvertedCurrency("Error converting currency")
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Business Income Estonia 🇪🇪</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Additional Features</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-80px)] pr-4">
                <div className="py-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>VAT Verification</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Input
                            placeholder="Enter VAT number"
                            value={vatNumber}
                            onChange={(e) => setVatNumber(e.target.value)}
                          />
                          <Button onClick={handleVatVerification} disabled={isVatLoading}>
                            {isVatLoading ? "Verifying..." : "Verify"}
                          </Button>
                        </div>
                        {isVatValid !== null && (
                          <div className={`flex items-center ${isVatValid ? "text-green-600" : "text-red-600"}`}>
                            {isVatValid ? <Check className="mr-2" /> : <X className="mr-2" />}
                            VAT number is {isVatValid ? "valid" : "invalid"}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Wise Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Button onClick={handleWiseBalanceCheck} disabled={isWiseLoading} className="w-full">
                          {isWiseLoading ? "Fetching..." : "Refresh Balance"}
                        </Button>
                        {wiseBalance && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Currency</TableHead>
                                <TableHead>Balance</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell>{wiseBalance.currency}</TableCell>
                                <TableCell>{wiseBalance.amount.toFixed(2)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Invoice Generator</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button  onClick={handleInvoiceGeneration} disabled={isInvoiceGenerating} className="w-full">
                        {isInvoiceGenerating ? "Generating..." : "Generate Invoice"}
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Currency Conversion</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Select value={targetCurrency} onValueChange={setTargetCurrency}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select target currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="JPY">JPY</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={handleCurrencyConversion} className="w-full">
                          Convert
                        </Button>
                        {convertedCurrency && (
                          <p>Yearly Net Income: {convertedCurrency}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="income">Simulate your net income</Label>
                      <div className="flex items-center mt-1">
                        <span className="text-gray-500 mr-2">€</span>
                        <Input
                          id="income"
                          type="number"
                          value={income}
                          onChange={(e) => setIncome(Number(e.target.value))}
                          className="flex-grow"
                        />
                        <Select value={incomeType} onValueChange={(value: IncomeType) => setIncomeType(value)}>
                          <SelectTrigger className="w-[120px] ml-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hourly">/ hour</SelectItem>
                            <SelectItem value="daily">/ day</SelectItem>
                            <SelectItem value="monthly">/ month</SelectItem>
                            <SelectItem value="yearly">/ year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="clientCountry">Client Country</Label>
                      <Select value={clientCountry} onValueChange={setClientCountry}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client country" />
                        </SelectTrigger>
                        <SelectContent>
                          <ScrollArea className="h-[200px]">
                            {Object.keys(vatRates).map((country) => (
                              <SelectItem key={country} value={country}>
                                {country}
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isGrossIncome"
                        checked={isGrossIncome}
                        onCheckedChange={(checked) => setIsGrossIncome(checked as boolean)}
                      />
                      <Label htmlFor="isGrossIncome">Is Gross Income?</Label>
                    </div>
                    <div>
                      <Label htmlFor="subcontractorIncome">Subcontractor Income</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          id="subcontractorIncome"
                          type="number"
                          value={subcontractorIncome}
                          onChange={(e) => setSubcontractorIncome(Number(e.target.value))}
                          className="flex-grow"
                        />
                        <Select value={subcontractorFrequency} onValueChange={(value: SubcontractorFrequency) => setSubcontractorFrequency(value)}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                      {expenses.map((expense, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="flex items-center space-x-2"
                        >
                          <Input
                            placeholder="Expense name"
                            value={expense.name}
                            onChange={(e) => {
                              const newExpenses = [...expenses]
                              newExpenses[index].name = e.target.value
                              setExpenses(newExpenses)
                            }}
                            className="flex-grow"
                          />
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={expense.amount}
                            onChange={(e) => {
                              const newExpenses = [...expenses]
                              newExpenses[index].amount = Number(e.target.value)
                              setExpenses(newExpenses)
                            }}
                            className="w-24"
                          />
                          <Select
                            value={expense.frequency}
                            onValueChange={(value: ExpenseFrequency) => {
                              const newExpenses = [...expenses]
                              newExpenses[index].frequency = value
                              setExpenses(newExpenses)
                            }}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                              <SelectItem value="one-time">One-time</SelectItem>
                            </SelectContent>
                          </Select>
                          <Checkbox
                            checked={expense.deductible}
                            onCheckedChange={(checked) => {
                              const newExpenses = [...expenses]
                              newExpenses[index].deductible = checked as boolean
                              setExpenses(newExpenses)
                            }}
                          />
                          <Label htmlFor={`deductible-${index}`}>Deductible</Label>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteExpense(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete expense</span>
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                  <Button onClick={addExpense} className="w-full mt-4">Add expense</Button>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Hourly</TableHead>
                          <TableHead>Daily</TableHead>
                          <TableHead>Monthly</TableHead>
                          <TableHead>Yearly</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>Gross Income</TableCell>
                          <TableCell>€{((calculations.yearlyNetIncome + calculations.yearlyVAT) / (52 * 5 * 8)).toFixed(2)}</TableCell>
                          <TableCell>€{((calculations.yearlyNetIncome + calculations.yearlyVAT) / (52 * 5)).toFixed(2)}</TableCell>
                          <TableCell>€{((calculations.yearlyNetIncome + calculations.yearlyVAT) / 12).toFixed(2)}</TableCell>
                          <TableCell>€{(calculations.yearlyNetIncome + calculations.yearlyVAT).toFixed(2)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>VAT ({calculations.vatRate}%)</TableCell>
                          <TableCell>€{(calculations.yearlyVAT / (52 * 5 * 8)).toFixed(2)}</TableCell>
                          <TableCell>€{(calculations.yearlyVAT / (52 * 5)).toFixed(2)}</TableCell>
                          <TableCell>€{(calculations.yearlyVAT / 12).toFixed(2)}</TableCell>
                          <TableCell>€{calculations.yearlyVAT.toFixed(2)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Net Income</TableCell>
                          <TableCell>€{calculations.hourlyNetIncome.toFixed(2)}</TableCell>
                          <TableCell>€{calculations.dailyNetIncome.toFixed(2)}</TableCell>
                          <TableCell>€{calculations.monthlyNetIncome.toFixed(2)}</TableCell>
                          <TableCell>€{calculations.yearlyNetIncome.toFixed(2)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Expenses</TableCell>
                          <TableCell>€{(calculations.totalExpenses / (52 * 5 * 8)).toFixed(2)}</TableCell>
                          <TableCell>€{(calculations.totalExpenses / (52 * 5)).toFixed(2)}</TableCell>
                          <TableCell>€{(calculations.totalExpenses / 12).toFixed(2)}</TableCell>
                          <TableCell>€{calculations.totalExpenses.toFixed(2)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Net After Expenses</TableCell>
                          <TableCell>€{(calculations.remainingAfterTaxes / (52 * 5 * 8)).toFixed(2)}</TableCell>
                          <TableCell>€{(calculations.remainingAfterTaxes / (52 * 5)).toFixed(2)}</TableCell>
                          <TableCell>€{(calculations.remainingAfterTaxes / 12).toFixed(2)}</TableCell>
                          <TableCell>€{calculations.remainingAfterTaxes.toFixed(2)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Dividend Income</TableCell>
                          <TableCell>€{(calculations.dividendIncome / (52 * 5 * 8)).toFixed(2)}</TableCell>
                          <TableCell>€{(calculations.dividendIncome / (52 * 5)).toFixed(2)}</TableCell>
                          <TableCell>€{(calculations.dividendIncome / 12).toFixed(2)}</TableCell>
                          <TableCell>€{calculations.dividendIncome.toFixed(2)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Expense Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Expense</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Deductible</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense, index) => (
                          <TableRow key={index}>
                            <TableCell>{expense.name}</TableCell>
                            <TableCell>€{expense.amount.toFixed(2)}</TableCell>
                            <TableCell>{expense.frequency}</TableCell>
                            <TableCell>{expense.deductible ? "Yes" : "No"}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell>Subcontractor Income</TableCell>
                          <TableCell>€{subcontractorIncome.toFixed(2)}</TableCell>
                          <TableCell>{subcontractorFrequency}</TableCell>
                          <TableCell>Yes</TableCell>
                        </TableRow>
                        <TableRow className="font-bold">
                          <TableCell>Total Expenses</TableCell>
                          <TableCell>€{calculations.totalExpenses.toFixed(2)}</TableCell>
                          <TableCell>Yearly</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}