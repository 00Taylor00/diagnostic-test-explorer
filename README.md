# Diagnostic Test Explorer

A modern React application for exploring diagnostic test characteristics and calculating post-test probabilities using likelihood ratios.

## Features

- **Interactive Data Table**: Browse 20+ diagnostic tests with sensitivity, specificity, and likelihood ratios
- **Search & Filter**: Find tests by name or condition
- **Sortable Columns**: Click any column header to sort the data
- **Prevalence Slider**: Adjust pre-test probability (1-90%)
- **Test Result Toggle**: Switch between positive and negative test results
- **Visual Probability Grids**: 10×10 grids showing sensitivity, specificity, and post-test probability
- **Dark Mode**: Toggle between light and dark themes (persistent)
- **Responsive Design**: Works on desktop and mobile devices

## Technical Details

- Built with **Next.js 15** and **React 19**
- Uses **shadcn/ui** components for consistent design
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide React** for icons

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. **Select a Test**: Click on any test name in the table to see its details
2. **Adjust Prevalence**: Use the slider to set the estimated prevalence in your population
3. **Choose Test Result**: Toggle between positive and negative results
4. **View Visualizations**: See sensitivity/specificity grids and post-test probability
5. **Filter Data**: Use the search box or condition dropdown to find specific tests

## Clinical Context

This tool helps clinicians understand:
- How test characteristics affect diagnostic accuracy
- The relationship between pre-test probability and post-test probability
- The impact of likelihood ratios on diagnostic reasoning
- Visual representation of probabilities for better understanding

## Data Sources

The diagnostic test data comes from peer-reviewed medical literature and systematic reviews. Each test includes:
- Sensitivity and specificity
- Positive and negative likelihood ratios (LR+ and LR-)
- Reference citation

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

Built for educational and clinical use. Always consider the complete clinical picture when making diagnostic decisions.
