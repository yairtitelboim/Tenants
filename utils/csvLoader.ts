import Papa from 'papaparse';

export async function loadCsvFile(filePath: string) {
  const response = await fetch(filePath);
  const csvText = await response.text();
  const { data } = Papa.parse(csvText, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });
  return data;
} 