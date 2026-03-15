import pandas as pd

df = pd.read_excel("PCOS_data_without_infertility.xlsx", sheet_name="Full_new")

df.head()
df.columns

df2 = pd.read_csv("PCOS_infertility.csv")
df2.head()

# Merge the two datasets on Sl. No
data = pd.merge(df, df2, on='Sl. No', suffixes=('', '_y'))
# Drop appropriately merged duplicate columns
data = data.drop(columns=[col for col in data.columns if col.endswith('_y')])

data.shape
data.head()

data.drop(['Sl. No', 'Patient File No.'], axis=1, inplace=True)

data['PCOS (Y/N)'] = data['PCOS (Y/N)'].replace({'Y':1,'N':0})

# Convert all stray string values to NaN before filling them
data = data.apply(pd.to_numeric, errors='coerce')
data.fillna(data.mean(), inplace=True)
X = data.drop('PCOS (Y/N)', axis=1)
y = data['PCOS (Y/N)']


from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

X_train,X_test,y_train,y_test = train_test_split(X,y,test_size=0.2,random_state=42)

model = RandomForestClassifier()

model.fit(X_train,y_train)

from sklearn.metrics import accuracy_score

pred = model.predict(X_test)

print("Accuracy:",accuracy_score(y_test,pred))

import joblib

joblib.dump(model,"pcos_model.pkl")