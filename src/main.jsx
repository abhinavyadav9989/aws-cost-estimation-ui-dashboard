import React from 'react'
import { createRoot } from 'react-dom/client'
import AWSBudgetEstimator from './aws_cost_estimator_ui_react_single_file'
import './index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AWSBudgetEstimator />
  </React.StrictMode>
)
