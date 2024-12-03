import pandas as pd
import os
import matplotlib.pyplot as plt
import seaborn as sns
import matplotlib.dates as mdates
from matplotlib.ticker import FuncFormatter
import numpy as np

current_dir = os.path.dirname(os.path.abspath(__file__))

# Read the CSV file
df = pd.read_csv(os.path.join(current_dir, 'combined_data.csv'), dtype=object)

# Analyze df
print("File 1 analysis:")
print(f"Total rows: {len(df)}")
print(f"Total columns: {len(df.columns)}")
print(f"Missing values:\n{df.isnull().sum()}")
print(f"Total missing values: {df.isnull().sum().sum()}")

print("\nFile 2 analysis:")
print(f"Total rows: {len(df)}")
print(f"Total columns: {len(df.columns)}")
print(f"Missing values:\n{df.isnull().sum()}")
print(f"Total missing values: {df.isnull().sum().sum()}")

# Basic data info
print("\nFile 1 info:")
df.info()

# Analyze tenant column
if 'tenant' in df.columns:
    print("\nTenant analysis:")
    tenant_counts = df['tenant'].value_counts()
    print(f"Number of unique tenants: {len(tenant_counts)}")
    print("\nTop 5 most common tenants:")
    print(tenant_counts.head())
    
    # Calculate percentage of total for top 5 tenants
    total_rows = len(df)
    top_5_percentages = (tenant_counts.head() / total_rows * 100).round(2)
    print("\nPercentage of total for top 5 tenants:")
    print(top_5_percentages)
else:
    print("\n'tenant' column not found in the dataset")

# Building ID to name mapping (move this outside of the create_dashboard function)
building_names = {
    '64d25fb2df40be5990c3d1e9': 'T3 Sterling Road',
    '64d21e6b17b44614ce5c5c61': 'CIBC SQUARE - 81 Bay Street',
    '646f274acde6d81392a7dfcd': '1144 Fifteenth Street',
    '64be43c7d106891d8cba3c08': '333 Wolf Point',
    '64ccb49e511e8217bdb5639c': '345 Hudson',
    '64d20b965a25354ca3d16aa2': '555 Greenwich',
    '64df5bc77fa516534ab379e4': 'T3 Bayside'
}

def format_large_number(num, pos):
    if num >= 1e6:
        return f'{num/1e6:.1f}M'
    elif num >= 1e3:
        return f'{num/1e3:.1f}K'
    else:
        return f'{num:.0f}'

def create_dashboard(df):
    plt.style.use('ggplot')
    fig, axs = plt.subplots(2, 2, figsize=(24, 20))
    fig.suptitle("Building Activity Analysis Dashboard", fontsize=28, fontweight='bold', y=1.02)

    # Color palette
    colors = plt.cm.Set3(np.linspace(0, 1, 7))  # Reduced to 7 colors

    # Filter for the specified buildings
    df_filtered = df[df['building_id'].isin(building_names.keys())]
    df_filtered['building_name'] = df_filtered['building_id'].map(building_names)

    # Print the number of events for each building after filtering
    print("\nNumber of events per building after filtering:")
    print(df_filtered['building_name'].value_counts())

    # 1. Most Active Buildings
    building_activity = df_filtered['building_name'].value_counts().sort_values(ascending=True)
    sns.barplot(x=building_activity.values, y=building_activity.index, ax=axs[0, 0], palette=colors.tolist())
    axs[0, 0].set_title('Most Active Buildings', fontsize=18, fontweight='bold')
    axs[0, 0].set_xlabel('Number of Events', fontsize=14)
    axs[0, 0].set_ylabel('')
    axs[0, 0].xaxis.set_major_formatter(FuncFormatter(format_large_number))
    for i, v in enumerate(building_activity.values):
        axs[0, 0].text(v, i, f' {format_large_number(v, None)}', va='center', fontsize=12)
    
    # 2. Top 3 Tenants by Building
    top_tenants = df_filtered.groupby('building_name')['tenant'].value_counts().groupby(level=0, group_keys=False).nlargest(3)
    top_tenants_pct = top_tenants.groupby(level=0).apply(lambda x: x / x.sum() * 100).unstack()
    top_tenants_pct.plot(kind='barh', stacked=True, ax=axs[0, 1], width=0.8, color=colors.tolist()[:3])
    axs[0, 1].set_title('Top 3 Tenants by Building (% of Building Activity)', fontsize=18, fontweight='bold')
    axs[0, 1].set_xlabel('Percentage of Building Activity', fontsize=14)
    axs[0, 1].set_ylabel('')
    axs[0, 1].legend(title='Tenants', bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=10)
    for c in axs[0, 1].containers:
        axs[0, 1].bar_label(c, fmt='%.1f%%', label_type='center', fontsize=10)

    # 3. Activity by Hour of Day
    df_filtered['hour'] = pd.to_datetime(df_filtered['event_at_local']).dt.hour
    hourly_activity = df_filtered.groupby(['building_name', 'hour']).size().unstack()
    sns.heatmap(hourly_activity, cmap='YlOrRd', ax=axs[1, 0], cbar_kws={'format': FuncFormatter(format_large_number), 'label': 'Number of Events'})
    axs[1, 0].set_title('Activity by Hour of Day', fontsize=18, fontweight='bold')
    axs[1, 0].set_xlabel('Hour of Day', fontsize=14)
    axs[1, 0].set_ylabel('Building', fontsize=14)
    axs[1, 0].set_xticklabels([f'{h:02d}:00' for h in range(24)], rotation=45, ha='right')
    axs[1, 0].axvline(x=9, color='blue', linestyle='--', alpha=0.7)
    axs[1, 0].axvline(x=17, color='blue', linestyle='--', alpha=0.7)
    axs[1, 0].text(13, -0.5, 'Business Hours', ha='center', va='center', color='blue', fontsize=10)

    # 4. Activity by Day of Week
    df_filtered['day_of_week'] = pd.to_datetime(df_filtered['event_at_local']).dt.dayofweek
    daily_activity = df_filtered.groupby(['building_name', 'day_of_week']).size().unstack()
    sns.heatmap(daily_activity, cmap='YlOrRd', ax=axs[1, 1], cbar_kws={'format': FuncFormatter(format_large_number), 'label': 'Number of Events'})
    axs[1, 1].set_title('Activity by Day of Week', fontsize=18, fontweight='bold')
    axs[1, 1].set_xlabel('Day of Week', fontsize=14)
    axs[1, 1].set_ylabel('Building', fontsize=14)
    axs[1, 1].set_xticklabels(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], rotation=0)
    
    # Add total activity numbers for each day
    day_totals = daily_activity.sum()
    for i, total in enumerate(day_totals):
        axs[1, 1].text(i, -0.5, f'{format_large_number(total, None)}', ha='center', va='top', fontsize=10)

    plt.tight_layout()
    plt.savefig(os.path.join(current_dir, 'improved_building_activity_dashboard.png'), dpi=300, bbox_inches='tight')
    plt.close()

# Add this before calling create_dashboard(df)
print("\nBuilding ID analysis:")
building_id_counts = df['building_id'].value_counts()
print(building_id_counts)

print("\nNumber of events for specified buildings:")
for building_id, building_name in building_names.items():
    count = building_id_counts.get(building_id, 0)
    print(f"{building_name}: {count}")

# Call the dashboard creation function
create_dashboard(df)
print("\nImproved dashboard created and saved as 'improved_building_activity_dashboard.png'")
