# San Francisco Historical Weather Visualization System

This project is an interactive, web-based visualization system designed to analyze long-term rainfall patterns in San Francisco. While the system includes secondary views for temperature, pressure, and climatic context, the primary emphasis is on rainfall trends, deviations, extreme precipitation events, and spatial rainfall distribution. It was implemented for the CSC 805 Data Visualization course at San Francisco State University.
## Overview

The application enables users to explore more than 30 years of historical rainfall in San Francisco through interactive dashboards, event classification, and a geographical climate map. It highlights year-to-year and month-to-month rainfall variation, extreme wet or dry years, and deviations from long-term historical baselines.

The system is designed for clarity and exploration, allowing users to investigate how rainfall patterns evolve over time and across different parts of the city.

## Features

### 1. Overview Dashboard

* Total rainfall and average monthly rainfall across the full dataset.
* Wettest and driest months in the selected year range.
* Interactive month-by-month rainfall trend chart with adjustable time range.

### 2. Seasonal Analysis

* Average monthly sea-level pressure.
* Minimum, mean, and maximum monthly temperature patterns.
* Automatically cleaned temperature data to resolve invalid readings.

### 3. Correlation Analysis

* Statistical relationships between temperature, pressure, rainfall, and humidity.
* Interactive scatterplots and correlation summaries.

### 4. Extreme Events

* Automatic classification of years by rainfall intensity:
  * Extreme high
  * Above average
  * Normal
  * Below average
  * Extreme low
* Deviation timeline showing standard deviation from historical rainfall mean.
* Highlighted “Notable Extreme Events” summarizing historically unusual years.

### 5. Dataset Export

* Direct export of the cleaned, processed dataset as CSV.
* Data preview table showing all available fields.
* Metadata summary including column count and row count.
* Source attribution and documentation of preprocessing.

### 6. San Francisco Climate Map

* Real San Francisco neighborhood boundaries using GeoJSON (DataSF).
* Choropleth map illustrating long-term average rainfall.
* Interactive hover panel displaying:
  * Neighborhood-level rainfall
  * Temperature and humidity averages
  * Aggregated citywide climate metrics
* Adjustable year-range slider for temporal exploration.

## Technology Stack

* Framework: React (Vite)
* Visualization Libraries: D3.js, MapLibre GL
* Styling: Tailwind CSS, custom components
* Data: CSV dataset (1992–2023) sourced from Kaggle
* Geo Data: San Francisco neighborhood shapefiles (DataSF)
* Deployment: Local development environment (npm / Vite)

## Dataset

The application uses the "San Francisco Weather Data" dataset from Kaggle.
Original source:
https://www.kaggle.com/datasets/noahx1/san-francisco-weather-data

Attributes include:
* date
* tavg, tmin, tmax
* prcp (precipitation)
* snow
* wspd, wdir, wpgt
* pres
* tsun

Several data-cleaning steps were applied:
* Correction of invalid temperature values outside the range [tmin, tmax]
* Removal of sentinel values such as -17.8
* Ensuring temporal consistency for all climatological metrics


## Installation
```# Install dependencies
npm install

# Run development server
npm run dev
```
Open the local development URL provided by Vite.

### Export Functionality

The “Export” view allows users to download the full cleaned dataset used within the application. This ensures full transparency and reproducibility of all visualizations.

### Acknowledgments

This project was completed as part of:

**CSC 805 – Data Visualization: Concepts, Tools, Techniques, and Paradigms**
Instructor: Dr. Shahrukh Humayoun
San Francisco State University

Original dataset: Kaggle – San Francisco Weather Data
Geospatial data: DataSF – San Francisco neighborhood boundaries
