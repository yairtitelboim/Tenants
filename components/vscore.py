import pandas as pd
import numpy as np
from datetime import datetime

def calculate_vibrancy_scores(csv_path):
    # Read CSV file
    df = pd.read_csv(csv_path)
    
    # Convert start_date to datetime and get latest data for each building
    df['start_date'] = pd.to_datetime(df['start_date'])
    latest_data = df.sort_values('start_date').groupby('name').last().reset_index()
    
    # Calculate scores for each building
    scores = []
    
    # Get max traffic for normalization
    max_traffic = latest_data['foottraffic'].max()
    
    for _, building in latest_data.iterrows():
        # 1. Traffic Score (normalized)
        traffic_score = building['foottraffic'] / max_traffic
        
        # 2. Dwell Score (weighted average of dwell times > 30 mins)
        dwell_times = [
            float(building.get(f'visits_by_dwell_time_{i}_{i+15}', 0)) 
            for i in range(30, 90, 15)
        ]
        dwell_score = sum(dwell_times) / building['foottraffic'] if building['foottraffic'] > 0 else 0
        
        # 3. Spread Score (evenness of distribution across hours)
        hourly_visits = [
            float(building.get(f'visits_by_hour_of_day_{str(i).zfill(2)}:00_{str(i+1).zfill(2)}:00', 0))
            for i in range(24)
        ]
        total_visits = sum(hourly_visits)
        ideal_distribution = total_visits / 24 if total_visits > 0 else 0
        
        # Calculate deviation from ideal distribution
        spread_score = 1 - sum(abs(v - ideal_distribution) for v in hourly_visits) / (total_visits * 2) if total_visits > 0 else 0
        
        # Combined score
        vibrancy_score = (traffic_score + dwell_score + spread_score) / 3
        
        scores.append({
            'name': building['name'],
            'state': building['region_code'],
            'date': building['start_date'].strftime('%Y-%m'),
            'vibrancy_score': vibrancy_score,
            'components': {
                'traffic_score': traffic_score,
                'dwell_score': dwell_score,
                'spread_score': spread_score
            }
        })
    
    # Sort by vibrancy score
    scores.sort(key=lambda x: x['vibrancy_score'], reverse=True)
    
    # Print top 3 and bottom 3
    print(f"\n=== Top 3 Most Vibrant Buildings (as of {scores[0]['date']}) ===")
    for i, score in enumerate(scores[:3], 1):
        print(f"{i}. {score['name']} ({score['state']})")
        print(f"   Score: {score['vibrancy_score']:.3f}")
        print(f"   Traffic: {score['components']['traffic_score']:.3f}")
        print(f"   Dwell: {score['components']['dwell_score']:.3f}")
        print(f"   Spread: {score['components']['spread_score']:.3f}\n")
    
    print("\n=== Bottom 3 Least Vibrant Buildings ===")
    for i, score in enumerate(scores[-3:], 1):
        print(f"{i}. {score['name']} ({score['state']})")
        print(f"   Score: {score['vibrancy_score']:.3f}")
        print(f"   Traffic: {score['components']['traffic_score']:.3f}")
        print(f"   Dwell: {score['components']['dwell_score']:.3f}")
        print(f"   Spread: {score['components']['spread_score']:.3f}\n")
    
    return scores

if __name__ == "__main__":
    csv_path = "public/data/Hines_monthly_2024-12-18.csv"
    scores = calculate_vibrancy_scores(csv_path)
