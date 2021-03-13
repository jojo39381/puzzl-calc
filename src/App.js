
import './App.css';
import React, {useState, useEffect} from 'react';
import {TextField} from '@material-ui/core'
import {InputLabel} from '@material-ui/core'
import {MenuItem} from '@material-ui/core'
import Back from './back.png'
import axios from 'axios'
import {Button} from '@material-ui/core'
import { withStyles} from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
const FormSectionStyle = {
    marginBottom: '50px'
}
const ResultBodyStyle = {
    width: "90%",
    margin: "0 auto"
}
function createData(name, amount) {
    return {name, amount};
}
const BackButton = withStyles({
    root: {
      color: '#0066ff',
    },
    label: {
      textTransform: 'none',
    },
})(Button);
const EditButton = withStyles({
    root: {
        borderRadius: 4,
        borderColor: "#E2E9F0",
        borderWidth: 1,
        color: '#0066ff',
        height: 41,
        width: 69
    },
    label: {
      textTransform: 'capitalize',
    },
})(Button);
const ContinueButton = withStyles({
    root: {
        borderRadius: 4,
        backgroundColor: 'black',
        color: 'white',
        height: 41,
        width: 69
    },
    label: {
      textTransform: 'capitalize',
    },
})(Button);
const FormStyle = {
  display:"block",
  marginBottom:15,
  width:"90%"
}
const FormDivStyle = {
  width:"100%"
}
const ButtonStyle = {
  marginTop:20,
  marginBottom: 10,
  width:"40%"
}
const InstructionStyle = {
  fontFamily: 'Inter',
  fontWeight: '400'
}
const FormTitle = {
    fontFamily: 'Inter',
    fontWeight: '800'
  }
const states = require('./states.json')
const freqs = [
  "Daily",
  "Weekly",
  "Bi-weekly",
  "Semi-monthly",
  "Monthly",
  "Quarterly",
  "Semi-annually",
  "Annually"
]
const federalTaxParams = require("./federalTaxParams.json")
var information = [];
var federalData = [];
var stateData = [];
var codeValueMapping = {}
function App() {
  const [allStatesDetails, setAllStatesDetails] = useState()
  const [userInput, setUserInput] = useState({})
  useEffect(() => {
    axios.post("https://engine.staging.joinpuzzl.com/api/taxparams/getTaxParameterDefinitions")
    .then((response) => {
      setAllStatesDetails(response.data.result)
      const initial = {"general": {
        "date": new Date().toISOString().split('T')[0],
        "state": "AZ",
        "pay_frequency": "Daily"
    }}
      initial["federal"] = prefill(federalTaxParams)
      initial["state"] = prefill(response.data.result["AZ"])
      setUserInput(initial)
      setPrefilled(true)
    })
  }, [])
  const [calculated, setCalculated] = useState(false)
  const [calculations, setCalculations] =useState([])
  const [prefilled, setPrefilled] = useState(false)
  const prefill = (cur) => {
    const tempState = {}
    for (var i = 0; i < cur.length; i++) {
        if (cur[i].type === "boolean") {
            tempState[cur[i].code] = false
            codeValueMapping[cur[i].code] = {"valueMap": {"false":"No","true":"Yes"}, "type":cur[i].type}
        }
        else if (cur[i].type === "options") {
            tempState[cur[i].code] = cur[i].options[0].code
            var mapping = {}
            var options = cur[i].options
            for (var y = 0; y < options.length; y++) {
                mapping[options[y].code] = options[y].name
            }
            codeValueMapping[cur[i].code] = {"valueMap":mapping, "type":cur[i].type}
        }
        else {
            codeValueMapping[cur[i].code] = {"valueMap":{}, "type":cur[i].type}
        }
    }
    return tempState
  }
  const handleFormChange = (event, category, context) => {
    const value = event.target.value
    const temp = {...userInput}
    if (category === "general" && context === "state") {
        const cur = allStatesDetails[value]
        temp["state"] = prefill(cur)
    }
    temp[category][context] = value
    setUserInput(temp)
  }
  const generalTaxParams = ["date", "address", "address_line_2", "state", "gross_pay", "gross_pay_YTD", "pay_frequency"]
  const validateForm = () => {
    for (var k = 0; k < generalTaxParams.length; k++) {
        const key = generalTaxParams[k]
        if (key === "address_line_2" || key === "gross_pay_YTD") {
            continue
        }
        if (!(key in userInput["general"]) || userInput["general"][key] === "" ) {
            return key
        }
    }    
    return "success"
    }
const getReadableValue = (key, value) => {
    const cur = codeValueMapping[key]
    if (cur.type === "options" || cur.type === "boolean") {
        return cur.valueMap[value]
    }
    else if (cur.type === "integer") {
        return value
    }
    else if (cur.type === "dollars") {
        return '$' + value
    }
}
  const [errorMsg, setErrorMsg] = useState("")
  const submitForm = async (e) => {
      console.log(userInput)
        e.preventDefault()
        const formValidated = validateForm()

        if (formValidated !== "success") {
            setErrorMsg(`Error: ${formValidated} field not filled in`)
            return 
        }
      setErrorMsg("")
      const federalParams = []
      const checkDate = userInput["general"]["date"]
      var dateList = checkDate.split("-").slice(1)
      dateList.push(checkDate.split("-")[0])
      const grossPay = parseInt(userInput["general"]["gross_pay"]).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
      const gross_pay_ytd = userInput["general"]["gross_pay_YTD"] && userInput["general"]["gross_pay_YTD"] !== "" ? parseInt(userInput["general"]["gross_pay_YTD"]).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : "---"
      information = [
        createData("Check date", dateList.join("/")),
        createData("Gross pay", "$" + grossPay),
        createData("Gross pay year to date", "$" +  gross_pay_ytd),
        createData("Pay frequency", userInput["general"]["pay_frequency"])
        ]
        const federal = userInput["federal"]
        for (var i = 0; i < federalTaxParams.length; i++) {
        const key = federalTaxParams[i].code
        var value = ""
        if (!(key in userInput["federal"]) || userInput["federal"][key] === "" ) {
            value = "0"
        }
        else {
            value = federal[key]
        }
        const curFederal = {"jurisdiction":"US", "code":key, "value":value}
        federalParams.push(curFederal)
        if (typeof(value) == "boolean") {
            value = value.toString()
        }
        federalData.push(createData(key, getReadableValue(key, value)))

        }
    const stateParams = []
    const stateP = userInput["state"]
    const stateDetail = allStatesDetails[userInput['general']['state']]
    for (var z = 0; z < stateDetail.length; z++) {
    const stateKey = stateDetail[z].code
    var stvalue = ""
    if (!(stateKey in userInput["state"]) || userInput["state"][stateKey] === "" ) {
        stvalue = "0"
    }
    else {
        stvalue = stateP[stateKey]
    }
    const curState = {"jurisdiction":userInput["general"]["state"], "code":stateKey, "value":stvalue}
    
    stateParams.push(curState)
    if (typeof(stvalue) == "boolean") {
        stvalue = stvalue.toString()
    }
    stateData.push(createData(stateKey, getReadableValue(stateKey, stvalue)))
}
    const locationInfo = {
        "street1": userInput["general"]["address"],
        "street2": userInput["general"]["address_line_2"],
        "city": userInput["general"]["city"],
        "state": userInput["general"]["state"],
        "zip": userInput["general"]["zip"]
    }
    const companyConfig = {
        "taxparams":[]
    }
   const gross_pay_YTD_included = "gross_pay_YTD" in userInput["general"] && userInput["general"]["gross_pay_YTD"] !== ""
   const firstCall = {
        "wages": [
            {
                "payType": "REG",
                "amount": gross_pay_YTD_included ? userInput["general"]["gross_pay_YTD"] : userInput["general"]["gross_pay"],
                "location": locationInfo
            }
        ],
        "employeeConfig": {
            "residency": locationInfo,
                "taxparams": federalParams.concat(stateParams),
                "accruals": []
        },
        "companyConfig": companyConfig,
        "payFrequency": "annually",
        "payDate": checkDate
    }
    const withholdingsRequest = await axios.post("https://engine.staging.joinpuzzl.com/api/calculator/calcTax", firstCall)
    const withholdings = withholdingsRequest.data.result
    if (!gross_pay_YTD_included){
        makeResults(withholdings)
        return
    }
    var accrual_withholdings = []
    for (var j = 0; j < withholdings.length; j++) {
        const witholdingObject = withholdings[j]
        const cur_withholding = {amount:witholdingObject.withheld, taxType:witholdingObject.codename}
        accrual_withholdings.push(cur_withholding)
    }
    const dayBeforeCheckDate = new Date(checkDate)
    dayBeforeCheckDate.setDate(dayBeforeCheckDate.getDate() - 1)
    const dayBeforeString = dayBeforeCheckDate.toISOString().split('T')[0]
    const secondCall = {
        "wages": [
            {
                "payType": "REG",
                "amount": userInput["general"]["gross_pay"],
                "location": locationInfo
            }
        ],
        "employeeConfig": {
            "residency": locationInfo,
                "taxparams": federalParams.concat(stateParams),
                "accruals": [
                    {
                        "payDate": dayBeforeString,
                        "residency": locationInfo,
                        "earnings": [
                            {
                                "location": locationInfo,
                                "amount": userInput["general"]["gross_pay_YTD"],
                                "payType": "REG"
                            }
                        ],
                        "withholdings": accrual_withholdings
                    }
                ]
        },
        "companyConfig": companyConfig,
        "payFrequency": userInput["general"]["pay_frequency"],
        "payDate": userInput["general"]["date"]
    } 
    console.log(secondCall)
    const finalWithholdingsRequest = await axios.post("https://engine.staging.joinpuzzl.com/api/calculator/calcTax", secondCall)
    const finalWithholdings = finalWithholdingsRequest.data.result
    makeResults(finalWithholdings)
    return
  }
const makeResults = (finalWithholdings) => {
    const grossPay = parseInt(userInput["general"]["gross_pay"])
    var curCalculations = [createData("Gross pay", grossPay.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }))]
    var amountSubtracted = 0.00
    finalWithholdings.forEach((row) => {
            if (row["payer"].includes("EMPLOYEE")) {
                return
            }
            curCalculations.push(createData(row["name"], row["withheld"].toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })))
            amountSubtracted += row["withheld"]
            console.log(amountSubtracted)
        }
    )      
    curCalculations.push(createData("Net pay", (grossPay - amountSubtracted).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })));
    console.log(curCalculations)
    setCalculations(curCalculations)
    setCalculated(true)
}
 const yes_or_no = [{code:"Yes", value:true}, {code:"No", value:false}]
  const backToInput = () => {
      setCalculated(false)
      setCalculations([])
  }
  return (
    <div className="App">
      <header className="App-header"/>
      {calculated ?
            <Grid  container spacing={12}>
            <Grid style={{ margin:"0 auto"}} item xs={12} sm={8} md={6} lg={4}>
            <div style={ResultBodyStyle}>
                    <h1 style={FormTitle}>Paycheck Calculator</h1>
                    <InputLabel style={InstructionStyle}>Let's take a look at your estimated earnings after taxes</InputLabel>
                    <BackButton style={{marginTop: 37}} onClick={backToInput}><img src={Back} width={15} height={15} alt="None"></img>Back to calculators </BackButton>
                    <div style={FormSectionStyle}>
                    <h2 style={FormTitle}>Your paycheck calculation:</h2>
                        <div style={{borderWidth:0.5, borderStyle:"solid", borderColor:"#B2BEC3", borderRadius: 5, color:"black", fontSize:15, padding:10}}>
                            {calculations.map((row, i) => (
                                <Grid container spacing={0} >
                                    <Grid style={{ padding:10, textAlign:"left", fontWeight:(i === calculations.length - 1 ? 800 : ""), borderTop: (i === calculations.length - 1 ? "0.5px solid #B2BEC3" : "None") }} item xs={6}>
                                        {row.name}
                                    </Grid>
                                    <Grid style={{padding:10, textAlign:"right", fontWeight:(i === calculations.length - 1 ? 800 : ""), borderTop: (i === calculations.length - 1 ? "0.5px solid #B2BEC3" : "None") }} item xs={6}>
                                        {"$" + row.amount}
                                    </Grid>     
                                </Grid>
                            ))}
                        </div>
                    </div>
                    <h2 style={FormTitle}>Results are based on:</h2>
                    <div style={{borderWidth:0.5, borderStyle:"solid", borderColor:"#B2BEC3", borderRadius: 5, color:"black", fontSize:15, padding:10}}>
                            {information.map((row) => (
                                <Grid container spacing={0} >
                                    <Grid style={{ padding:10, textAlign:"left"}} item xs={6}>
                                        {row.name}
                                    </Grid>
                                    <Grid style={{padding:10, textAlign:"right"}} item xs={6}>
                                        {row.amount}
                                    </Grid>     
                                </Grid>
                            ))}
                            <Grid container spacing={0} >
                                <Grid style={{ padding:10, textAlign:"left", borderBottom: "0.5px solid #B2BEC3", fontWeight:800}} item xs={12}>
                                    {"Federal"}
                                </Grid>  
                              </Grid>
                            {federalData.map((row) => (
                                <Grid container spacing={0} >
                                    <Grid style={{ padding:10, textAlign:"left"}} item xs={6}>
                                        {row.name}
                                    </Grid>
                                    <Grid style={{padding:10, textAlign:"right"}} item xs={6}>
                                        {row.amount}
                                    </Grid>     
                                </Grid>
                            ))}
                            <Grid container spacing={0} >
                                <Grid style={{ padding:10, textAlign:"left", borderBottom: "0.5px solid #B2BEC3", fontWeight:800}} item xs={12}>
                                    {"State"}
                                </Grid>  
                              </Grid>
                            {stateData.map((row) => (
                                <Grid container spacing={0} >
                                    <Grid style={{ padding:10, textAlign:"left"}} item xs={6}>
                                        {row.name}
                                    </Grid>
                                    <Grid style={{padding:10, textAlign:"right"}} item xs={6}>
                                        {row.amount}
                                    </Grid>     
                                </Grid>
                            ))}
                        </div>
                    
                    </div>
                    <EditButton style={{marginTop: 26}} variant="outlined" onClick={backToInput}>Edit</EditButton>
                </Grid>
                </Grid>
        : 
        <Grid  container spacing={12}>
        <Grid style={{ margin:"0 auto"}} item xs={9} md={6} lg={4}>
        <div style={ResultBodyStyle}>
          <h1 style={FormTitle}>Paycheck Calculator</h1>
          <p style={InstructionStyle}>Find out your true estimated earnings after taxes</p>
          <form style={FormDivStyle} noValidate autoComplete="off" onSubmit={submitForm}>
          { prefilled && 
            <div style={FormSectionStyle}>
            <h3 style={FormTitle}>First, tell us some general information:</h3>
            <TextField  label="Check date" type='date' fullWidth={true} style={FormStyle} size="small" id="outlined-basic" variant="outlined" value={userInput["general"]["date"] || new Date().toISOString().split('T')[0]} onChange={(e) => {handleFormChange(e, "general", "date")}}/>
            <TextField required fullWidth={true} style={FormStyle} size="small" id="outlined-basic" variant="outlined" label="Address" value={userInput["general"]["address"] || ""} onChange={(e) => {handleFormChange(e, "general", "address")}}/>
            <TextField fullWidth={true} style={FormStyle} size="small" id="outlined-basic" variant="outlined" label="Address line 2" value={userInput["general"]["address_line_2"] || ""} onChange={(e) => {handleFormChange(e, "general", "address_line_2")}}/>
            <TextField required fullWidth={true} style={FormStyle} size="small" id="outlined-basic" variant="outlined" label="City" value={userInput["general"]["city"] || ""} onChange={(e) => {handleFormChange(e, "general", "city")}}/>
            <TextField
                fullWidth={true}
                style={FormStyle}
                size="small"
                id="state-selection"
                select
                label="State"
                value={userInput["general"]["state"] || states[0].abbreviation}
                onChange={(e) => {handleFormChange(e, "general", "state")}}
                variant="outlined"
              >
                {states.map((stateOption) => (
                  <MenuItem value={stateOption.abbreviation}>
                    {stateOption.name}
                  </MenuItem>
                ))}
            </TextField>
            <TextField type="number" required fullWidth={true} style={FormStyle} size="small" id="outlined-basic" variant="outlined" label="Zip" value={userInput["general"]["zip"] || ""} onChange={(e) => {handleFormChange(e, "general", "zip")}}/>
            <TextField type="number" required fullWidth={true} style={FormStyle} size="small" id="outlined-basic" label="Gross pay" variant="outlined"  value={userInput["general"]["gross_pay"] || ""} onChange={(e) => {handleFormChange(e, "general", "gross_pay")}}/>
            <TextField type="number" fullWidth={true} style={FormStyle} size="small" id="outlined-basic" label="Gross pay YTD" variant="outlined" value={userInput["general"]["gross_pay_YTD"] || ""} onChange={(e) => {handleFormChange(e, "general", "gross_pay_YTD")}}/>
            <TextField required fullWidth={true} style={FormStyle} size="small" id="outlined-basic" select label="Pay frequency" variant="outlined" value={userInput["general"]["pay_frequency"] || freqs[0]} onChange={(e) => {handleFormChange(e, "general", "pay_frequency")}}>
            {freqs.map((freqOption) => (
                    <MenuItem value={freqOption}>
                      {freqOption}
                    </MenuItem>
                ))}
            </TextField>
            </div>
          }
            <div style={FormSectionStyle}>
            <h3 style={FormTitle}>Now for some federal information:</h3>
           { prefilled && federalTaxParams && federalTaxParams.map((detail) => {
             if (detail.type === "options") {
               return (
                <TextField fullWidth={true} style={FormStyle} size="small" id="outlined-basic" label={detail.code} variant="outlined" select value={userInput["federal"][detail.code]} onChange={(e) => {handleFormChange(e, "federal", detail.code)}}>
               {detail.options.map((option) => (
                <MenuItem value={option.code}>
                    {option.name}
                  </MenuItem>
               ))}
                </TextField>
               )
             }
             else if (detail.type === "boolean") {
                return (
                <TextField fullWidth={true} style={FormStyle}  size="small" id="outlined-basic" label={detail.code} variant="outlined" select value={userInput["federal"][detail.code] || false} onChange={(e) => {handleFormChange(e, "federal", detail.code)}}>
               {[{code:"Yes", value:true}, {code:"No", value:false}].map((option) => (
                <MenuItem value={option.value}>
                    {option.code}
                  </MenuItem>
               ))}
                </TextField>
               )}
            else {
              return (
                <TextField type="number" fullWidth={true} style={FormStyle} size="small" id="outlined-basic" label={detail.code} variant="outlined"  value={userInput["federal"][detail.code] || ""} onChange={(e) => {handleFormChange(e, "federal", detail.code)}}/>
              )
            }})}
           </div>
           <h3 style={FormTitle}>Now for some state information:</h3>
           { prefilled && userInput["general"]["state"] && allStatesDetails && allStatesDetails[userInput["general"]["state"]].map((detail) => {
             if (detail.type === "options") {
               return (
                <TextField fullWidth={true} style={FormStyle} size="small" id="outlined-basic" label={detail.code} variant="outlined" select value={userInput["state"][detail.code]} onChange={(e) => {handleFormChange(e, "state", detail.code)}}>
               {detail.options.map((option) => (
                <MenuItem value={option.code}>
                    {option.name}
                  </MenuItem>
               ))}
                </TextField>
               )}
            else if (detail.type === "boolean") {
                return (
                <TextField fullWidth={true} style={FormStyle}  size="small" id="outlined-basic" label={detail.code} variant="outlined" select value={userInput["state"][detail.code]} onChange={(e) => {handleFormChange(e, "state", detail.code)}}>
               {yes_or_no.map((option) => (
                <MenuItem value={option.value}>
                    {option.code}
                  </MenuItem>
               ))}
                </TextField>
                )}
            else {
              return (
                <TextField type="number" fullWidth={true} style={FormStyle} size="small" id="outlined-basic" label={detail.code} variant="outlined" value={userInput["state"][detail.code] || ""} onChange={(e) => {handleFormChange(e, "state", detail.code)}}/>
              )
            }})
           } 
            <ContinueButton type="submit" style={ButtonStyle} variant="contained" color="primary">Continue</ContinueButton>
            {errorMsg !== "" ? <p style={{display:"inline-block", marginLeft:20, color:"red"}}>{errorMsg}</p> : null}
          </form>
        </div>
       </Grid>
       </Grid>
        } 
    </div>
  );
}

export default App;
