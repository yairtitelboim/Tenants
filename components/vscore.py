import pandas as pd
import numpy as np
from datetime import datetime

def calculate_detailed_vibrancy_scores(csv_path):
    # Read CSV file
    df = pd.read_csv(csv_path)
    
    # Convert start_date to datetime and extract quarter
    df['start_date'] = pd.to_datetime(df['start_date'])
    df['quarter'] = df['start_date'].dt.to_period('Q')
    
    # Initialize results list
    results = []
    
    # Analyze each quarter
    for quarter, group in df.groupby('quarter'):
        latest_data = group.sort_values('start_date').groupby('name').last().reset_index()
        
        # Get max traffic for normalization (per region)
        region_max_traffic = latest_data.groupby('region_code')['foottraffic'].max()
        global_max_traffic = latest_data['foottraffic'].max()
        
        for _, building in latest_data.iterrows():
            # Calculate scores
            traffic_score = building['foottraffic'] / region_max_traffic[building['region_code']]
            dwell_times = [
                float(building.get(f'visits_by_dwell_time_{i}_{i+15}', 0)) 
                for i in range(30, 90, 15)
            ]
            dwell_score = sum(dwell_times) / building['foottraffic'] if building['foottraffic'] > 0 else 0
            hourly_visits = [
                float(building.get(f'visits_by_hour_of_day_{str(i).zfill(2)}:00_{str(i+1).zfill(2)}:00', 0))
                for i in range(24)
            ]
            total_visits = sum(hourly_visits)
            ideal_distribution = total_visits / 24 if total_visits > 0 else 0
            spread_score = 1 - sum(abs(v - ideal_distribution) for v in hourly_visits) / (total_visits * 2) if total_visits > 0 else 0
            vibrancy_score = (traffic_score + dwell_score + spread_score) / 3
            
            results.append({
                'building_name': building['name'],
                'state': building['region_code'],
                'quarter': str(quarter),
                'vibrancy_score': round(vibrancy_score, 3),
                'traffic_score': round(traffic_score, 3),
                'dwell_score': round(dwell_score, 3),
                'spread_score': round(spread_score, 3),
                'raw_foottraffic': int(building['foottraffic'])
            })
    
    # Convert to DataFrame and sort by vibrancy score
    results_df = pd.DataFrame(results)
    results_df = results_df.sort_values(['quarter', 'vibrancy_score'], ascending=[True, False])
    
    # Save to CSV
    output_path = 'detailed_vibrancy_scores.csv'
    results_df.to_csv(output_path, index=False)
    
    # Detailed analysis for 101 California
    cal_data = results_df[results_df['building_name'] == '101 California']
    local_market = results_df[results_df['state'] == 'CA']
    top_performers = results_df.groupby('quarter').head(5)
    
    print("\n101 California Detailed Analysis:")
    for _, row in cal_data.iterrows():
        print(f"Quarter: {row['quarter']}, Vibrancy Score: {row['vibrancy_score']:.3f}, "
              f"Traffic: {row['traffic_score']:.3f}, Dwell: {row['dwell_score']:.3f}, "
              f"Spread: {row['spread_score']:.3f}, Foottraffic: {row['raw_foottraffic']:,}")
    
    print("\nLocal Market Comparison (CA):")
    print(local_market[['building_name', 'vibrancy_score', 'traffic_score', 'dwell_score', 'spread_score']])
    
    print("\nTop Performers Across Markets:")
    print(top_performers[['building_name', 'state', 'vibrancy_score', 'traffic_score', 'dwell_score', 'spread_score']])
    
    return output_path

def analyze_101_california(csv_path, meta_csv_path):
    # Read both CSVs
    df = pd.read_csv(csv_path)
    meta_df = pd.read_csv(meta_csv_path)
    
    # Convert dates and filter for 101 California
    df['start_date'] = pd.to_datetime(df['start_date'])
    cal_data = df[df['name'] == '101 California']
    
    # Monthly Traffic Analysis
    monthly_traffic = cal_data.groupby(cal_data['start_date'].dt.strftime('%Y-%m'))[['foottraffic']].sum()
    peak_month = monthly_traffic.idxmax()[0]
    peak_traffic = monthly_traffic.max()[0]
    
    # Dwell Time Analysis
    dwell_columns = [col for col in df.columns if 'visits_by_dwell_time' in col]
    dwell_data = cal_data[dwell_columns].mean()
    
    # Calculate average dwell time (weighted average)
    dwell_times = {
        '0-5': 2.5,
        '5-10': 7.5,
        '10-15': 12.5,
        '15-30': 22.5,
        '30-45': 37.5,
        '45-60': 52.5,
        '60-75': 67.5,
        '75-90': 82.5
    }
    
    total_weighted_time = 0
    total_visitors = 0
    for col in dwell_columns:
        time_range = col.split('_')[-2:]
        time_key = f"{time_range[0]}-{time_range[1]}"
        if time_key in dwell_times:
            visitors = cal_data[col].mean()
            total_weighted_time += visitors * dwell_times[time_key]
            total_visitors += visitors
    
    avg_dwell_time = total_weighted_time / total_visitors if total_visitors > 0 else 0
    
    # Demographic Analysis
    demo_columns = [col for col in df.columns if any(x in col.lower() for x in ['income', 'education', 'distance'])]
    demo_data = cal_data[demo_columns].mean()
    
    # Compare with top 10 buildings
    latest_data = df.sort_values('start_date').groupby('name').last().reset_index()
    top_10 = latest_data.nlargest(10, 'foottraffic')
    
    print("\n=== 101 California Detailed Analysis ===")
    print(f"\nTraffic Patterns:")
    print(f"Peak Month: {peak_month} with {peak_traffic:,.0f} visitors")
    print(f"Average Monthly Traffic: {cal_data['foottraffic'].mean():,.0f}")
    
    print(f"\nVisitor Engagement:")
    print(f"Average Dwell Time: {avg_dwell_time:.1f} minutes")
    print("\nDwell Time Distribution:")
    for col in dwell_columns:
        time_range = col.split('_')[-2:]
        print(f"{time_range[0]}-{time_range[1]} mins: {cal_data[col].mean():,.0f} visitors")
    
    print("\nDemographic Insights:")
    for col in demo_columns:
        print(f"{col}: {demo_data[col]:,.2f}")
    
    print("\nRanking Among Top 10 Properties:")
    rank_df = top_10[['name', 'foottraffic']].copy()
    rank_df['rank'] = rank_df['foottraffic'].rank(ascending=False)
    print(rank_df)
    
    return {
        'peak_month': peak_month,
        'peak_traffic': peak_traffic,
        'avg_dwell_time': avg_dwell_time,
        'demographics': demo_data.to_dict(),
        'rankings': rank_df.to_dict('records')
    }

def analyze_one_vanderbilt(csv_path, meta_csv_path):
    # Read both CSVs
    df = pd.read_csv(csv_path)
    meta_df = pd.read_csv(meta_csv_path)
    
    # Convert dates and filter for One Vanderbilt
    df['start_date'] = pd.to_datetime(df['start_date'])
    ova_data = df[df['name'] == 'One Vanderbilt']
    
    # Monthly Traffic Analysis with Observation Deck Adjustment
    monthly_traffic = ova_data.groupby(ova_data['start_date'].dt.strftime('%Y-%m'))[['foottraffic']].sum()
    peak_month = monthly_traffic.idxmax()[0]
    peak_traffic = monthly_traffic.max()[0]
    
    # Estimate office vs observation deck traffic
    obs_deck_ratio = 0.55  # 55% of traffic is observation deck
    estimated_office_traffic = monthly_traffic * (1 - obs_deck_ratio)
    estimated_obs_deck_traffic = monthly_traffic * obs_deck_ratio
    
    # Dwell Time Analysis
    dwell_columns = [col for col in df.columns if 'visits_by_dwell_time' in col]
    dwell_data = ova_data[dwell_columns].mean()
    
    # Calculate average dwell time (weighted average)
    dwell_times = {
        '0-5': 2.5,
        '5-10': 7.5,
        '10-15': 12.5,
        '15-30': 22.5,
        '30-45': 37.5,
        '45-60': 52.5,
        '60-75': 67.5,
        '75-90': 82.5
    }
    
    total_weighted_time = 0
    total_visitors = 0
    for col in dwell_columns:
        time_range = col.split('_')[-2:]
        time_key = f"{time_range[0]}-{time_range[1]}"
        if time_key in dwell_times:
            visitors = ova_data[col].mean()
            total_weighted_time += visitors * dwell_times[time_key]
            total_visitors += visitors
    
    avg_dwell_time = total_weighted_time / total_visitors if total_visitors > 0 else 0
    
    # Demographic Analysis
    demo_columns = [col for col in df.columns if any(x in col.lower() for x in ['income', 'education', 'distance'])]
    demo_data = ova_data[demo_columns].mean()
    
    # Compare with top 10 buildings
    latest_data = df.sort_values('start_date').groupby('name').last().reset_index()
    top_10 = latest_data.nlargest(10, 'foottraffic')
    
    print("\n=== One Vanderbilt Detailed Analysis ===")
    print(f"\nTraffic Patterns (Monthly Averages):")
    print(f"Total Traffic: {ova_data['foottraffic'].mean():,.0f}")
    print(f"Estimated Office Traffic: {ova_data['foottraffic'].mean() * (1-obs_deck_ratio):,.0f}")
    print(f"Estimated Observation Deck Traffic: {ova_data['foottraffic'].mean() * obs_deck_ratio:,.0f}")
    print(f"Peak Month: {peak_month} with {peak_traffic:,.0f} total visitors")
    
    print(f"\nVisitor Engagement:")
    print(f"Average Dwell Time: {avg_dwell_time:.1f} minutes")
    print("\nDwell Time Distribution:")
    for col in dwell_columns:
        time_range = col.split('_')[-2:]
        print(f"{time_range[0]}-{time_range[1]} mins: {ova_data[col].mean():,.0f} visitors")
    
    print("\nDemographic Insights:")
    for col in demo_columns:
        print(f"{col}: {demo_data[col]:,.2f}")
    
    print("\nRanking Among Top 10 Properties:")
    rank_df = top_10[['name', 'foottraffic']].copy()
    rank_df['rank'] = rank_df['foottraffic'].rank(ascending=False)
    print(rank_df)
    
    return {
        'peak_month': peak_month,
        'peak_traffic': peak_traffic,
        'avg_dwell_time': avg_dwell_time,
        'demographics': demo_data.to_dict(),
        'rankings': rank_df.to_dict('records'),
        'estimated_office_traffic': estimated_office_traffic,
        'estimated_obs_deck_traffic': estimated_obs_deck_traffic
    }

if __name__ == "__main__":
    csv_path = "public/data/Hines_monthly_2024-12-18.csv"
    meta_csv_path = "public/data/Meta_Hines_monthly_2024-12-06.csv"
    results = analyze_one_vanderbilt(csv_path, meta_csv_path)
